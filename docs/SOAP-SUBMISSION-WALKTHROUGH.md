# SOAP Submission Walkthrough

How CI data flows from an Oracle query result through the client-side store, across the Fastify API, and into a PeopleSoft SOAP XML envelope.

---

## Table of Contents

1. [Pipeline Overview](#pipeline-overview)
2. [Stage 1: Oracle Query → CI Strings](#stage-1-oracle-query--ci-strings)
3. [Stage 2: CI String Parsing](#stage-2-ci-string-parsing)
4. [Stage 3: Payload Construction](#stage-3-payload-construction)
5. [Stage 4: Client API Call](#stage-4-client-api-call)
6. [Stage 5: Server Handler → SOAP Service](#stage-5-server-handler--soap-service)
7. [Stage 6: XML Envelope → PeopleSoft](#stage-6-xml-envelope--peoplesoft)
8. [Stage 7: Response Handling](#stage-7-response-handling)
9. [Concrete Examples](#concrete-examples)
10. [Dev vs. Production Branching](#dev-vs-production-branching)
11. [Error Handling Strategy](#error-handling-strategy)

---

## Pipeline Overview

```
Oracle SQL Query
  │  (returns rows with pipe-delimited CI string columns)
  ▼
parseCIDataFromRecords()          ← src/server/ci-definitions/parser.ts
  │  (splits pipes, extracts ACTION|CI_NAME|KEY:VALUE pairs)
  ▼
Typed CI Records                  ← PositionCreateRecord, JobUpdateRecord, etc.
  │  (stored in SmartForm store state)
  ▼
buildSOAPPayload()                ← src/server/ci-definitions/parser.ts
  │  (filters record fields through template definition)
  ▼
soapApi.ci.submit()               ← src/services/soap/soapApi.ts
  │  (POST /api/soap/submit with JSON body)
  │  data: single payload OR array of payloads (based on isSoapBatchMode)
  ▼
handleSubmit()                    ← src/server/soap/handlers.ts
  │  (validates request, routes based on Array.isArray(body.data))
  │  ├── single record → soapService.submitData()
  │  └── array of records → soapService.submitBatch()
  ▼
soapService.submitData()          ← src/server/soap/soapService.ts  (single)
soapService.submitBatch()         ← src/server/soap/soapService.ts  (batch)
  │  (builds XML, sends to PeopleSoft with retry logic)
  ▼
buildSubmitRequest()              ← src/server/soap/xmlBuilder.ts  (single)
buildMultiRecordSubmitRequest()   ← src/server/soap/xmlBuilder.ts  (batch)
  │  (constructs SOAP XML envelope — one record or multiple)
  ▼
PeopleSoft IScript_SOAPToCI       ← HTTPS endpoint on PeopleSoft server
  │  (processes CI operation, returns XML response)
  ▼
parseSOAPResponse()               ← src/server/soap/xmlParser.ts
  │  (extracts notification code + transaction messages)
  ▼
SmartForm store status update      ← 'success' or 'error' with message
```

---

## Stage 1: Oracle Query → CI Strings

The Oracle SQL query (`smartform-pending-transactions.sql`) returns rows where each row is a pending transaction. Four columns contain **pipe-delimited CI strings** built by the SQL itself:

| Column | CI Target | Action | Purpose |
|--------|-----------|--------|---------|
| `POSITION_CREATE_CI` | `CI_POSITION_DATA` | `CREATE` | Create a new position |
| `POSITION_UPDATE_CI` | `CI_POSITION_DATA` | `UPDATE` | Update existing position fields |
| `JOB_UPDATE_CI` | `CI_JOB_DATA` | `UPDATEDATA` | Link employee to position |
| `DEPT_CO_UPDATE_CI` | `DEPARTMENT_TBL` | `UPDATEDATA` | Update department company |

**CI string format:**

```
ACTION|CI_NAME|FIELD1:VALUE1|FIELD2:VALUE2|...
```

**Real example from a Manager record:**

```
UPDATE|CI_POSITION_DATA|POSITION_NBR:POS00001|EFFDT:01-FEB-25|EFF_STATUS:A|ACTION_REASON:UPD|UPDATE_INCUMBENTS:Y|BUSINESS_UNIT:WMH|DEPTID:2213|JOBCODE:220099|REPORTS_TO:800001|LOCATION:MAIN|COMPANY:WFM|STD_HOURS:40|UNION_CD:NON|SHIFT:1|REG_TEMP:R|FULL_PART_TIME:F|INCLUDE_TITLE:Y
```

A column value of `null` means "no CI submission needed for this record/type."

---

## Stage 2: CI String Parsing

**File:** `src/server/ci-definitions/parser.ts`

After the Oracle query returns, `parseCIDataFromRecords()` processes all rows:

```typescript
// Called in smartFormStore after query execution
const parsedCIData = parseCIDataFromRecords(transactions);
```

For each record, the parser:

1. **Splits** the string on `|` delimiters
2. **Extracts** segment 0 as `action`, segment 1 as `ciName`
3. **Parses** remaining segments as `KEY:VALUE` pairs into a `Map<string, string>`
4. **Converts** the generic record to a typed interface via converter functions

**Parsing the example above:**

```
Segment 0: "UPDATE"          → action
Segment 1: "CI_POSITION_DATA" → ciName
Segment 2: "POSITION_NBR:POS00001" → fields.set('POSITION_NBR', 'POS00001')
Segment 3: "EFFDT:01-FEB-25"       → fields.set('EFFDT', '01-FEB-25')
...
```

**Result — a typed `PositionUpdateRecord`:**

```typescript
{
  transactionNbr: '123456',     // links back to parent SmartFormRecord
  action: 'UPDATE',             // ActionType
  ciName: 'CI_POSITION_DATA',   // CI name for SOAP routing
  POSITION_NBR: 'POS00001',
  EFFDT: '01-FEB-25',
  EFF_STATUS: 'A',
  ACTION_REASON: 'UPD',
  UPDATE_INCUMBENTS: 'Y',
  BUSINESS_UNIT: 'WMH',
  DEPTID: '2213',
  JOBCODE: '220099',
  REPORTS_TO: '800001',
  LOCATION: 'MAIN',
  COMPANY: 'WFM',
  STD_HOURS: '40',
  UNION_CD: 'NON',
  SHIFT: '1',
  REG_TEMP: 'R',
  FULL_PART_TIME: 'F',
  INCLUDE_TITLE: 'Y',
}
```

All parsed records are stored in the SmartForm store's `parsedCIData`, grouped by type:

```typescript
interface ParsedCIData {
  positionCreate: PositionCreateRecord[];
  positionUpdate: PositionUpdateRecord[];
  jobUpdate: JobUpdateRecord[];
  deptCoUpdate: DeptCoUpdateRecord[];
}
```

---

## Stage 3: Payload Construction

**File:** `src/server/ci-definitions/parser.ts` — `buildSOAPPayload()`

When a submission function runs (e.g., `submitPositionData`), it:

1. Finds the matching parsed CI record by `transactionNbr`
2. Calls `buildSOAPPayload(ciRecord, TEMPLATE.fields)` to extract only template-defined fields

```typescript
const ciRecord = get().parsedCIData.positionUpdate.find(
  r => r.transactionNbr === txnNbr
);
const payload = buildSOAPPayload(ciRecord, POSITION_UPDATE_CI_TEMPLATE.fields);
```

`buildSOAPPayload` iterates the template's field list and copies matching values from the record. This ensures only sanctioned fields are sent (no `transactionNbr`, `action`, or `ciName` leak into the payload):

```typescript
// Input: full typed record with metadata fields
// Output: clean payload with only CI-relevant fields
{
  POSITION_NBR: 'POS00001',
  EFFDT: '01-FEB-25',
  EFF_STATUS: 'A',
  ACTION_REASON: 'UPD',
  UPDATE_INCUMBENTS: 'Y',
  BUSINESS_UNIT: 'WMH',
  DEPTID: '2213',
  JOBCODE: '220099',
  REPORTS_TO: '800001',
  LOCATION: 'MAIN',
  COMPANY: 'WFM',
  STD_HOURS: '40',
  UNION_CD: 'NON',
  SHIFT: '1',
  REG_TEMP: 'R',
  FULL_PART_TIME: 'F',
  INCLUDE_TITLE: 'Y',
}
```

---

## Stage 4: Client API Call

**File:** `src/services/soap/soapApi.ts`

The store calls `soapApi.ci.submit()`:

```typescript
const result = await soapApi.ci.submit(ciRecord.ciName, ciRecord.action, payload);
```

This sends a `POST` to `/api/soap/submit`:

```http
POST /api/soap/submit HTTP/1.1
Content-Type: application/json
X-Session-Token: <session-token>

{
  "ciName": "CI_POSITION_DATA",
  "action": "UPDATE",
  "data": {
    "POSITION_NBR": "POS00001",
    "EFFDT": "01-FEB-25",
    "EFF_STATUS": "A",
    "ACTION_REASON": "UPD",
    ...
  }
}
```

---

## Stage 5: Server Handler → SOAP Service

**Files:**
- `src/server/soap/handlers.ts` — `handleSubmit()`
- `src/server/soap/soapService.ts` — `submitData()`

The handler validates the request, then delegates:

```typescript
const result = await soapService.submitData(body.ciName, action, body.data);
```

The SOAP service:
1. Retrieves stored credentials (from the earlier SOAP connection)
2. Builds the PeopleSoft endpoint URL
3. Builds authentication headers (non-standard `userid`/`pwd` headers)
4. Calls `buildSubmitRequest()` to construct the XML envelope
5. Sends the request with retry logic

---

## Stage 6: XML Envelope → PeopleSoft

**Files:**
- `src/server/soap/xmlBuilder.ts` — `buildSubmitRequest()`
- `src/server/soap/config.ts` — `buildEndpointURL()`

### URL Construction

```
https://<server>:<port>/psc/<siteName>/<portal>/<node>/s/WEBLIB_SOAPTOCI.SOAPTOCI.FieldFormula.IScript_SOAPToCI?languageCd=ENG&disconnect=y&postDataBin=y
```

With placeholder values:

```
https://psft-server:443/psc/HRPROD/EMPLOYEE/PT_LOCAL/s/WEBLIB_SOAPTOCI.SOAPTOCI.FieldFormula.IScript_SOAPToCI?languageCd=ENG&disconnect=y&postDataBin=y
```

### XML Envelope

The root tag follows PeopleSoft's naming convention: `{ACTION}__CompIntfc__{CI_NAME}`.

**Position Update example:**

```xml
<?xml version="1.0"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <UPDATE__CompIntfc__CI_POSITION_DATA debug="Y" preserveblanks="Y" optionalKeys="Y">
      <POSITION_NBR>POS00001</POSITION_NBR>
      <EFFDT>01-FEB-25</EFFDT>
      <EFF_STATUS>A</EFF_STATUS>
      <ACTION_REASON>UPD</ACTION_REASON>
      <UPDATE_INCUMBENTS>Y</UPDATE_INCUMBENTS>
      <BUSINESS_UNIT>WMH</BUSINESS_UNIT>
      <DEPTID>2213</DEPTID>
      <JOBCODE>220099</JOBCODE>
      <REPORTS_TO>800001</REPORTS_TO>
      <LOCATION>MAIN</LOCATION>
      <COMPANY>WFM</COMPANY>
      <STD_HOURS>40</STD_HOURS>
      <UNION_CD>NON</UNION_CD>
      <SHIFT>1</SHIFT>
      <REG_TEMP>R</REG_TEMP>
      <FULL_PART_TIME>F</FULL_PART_TIME>
      <INCLUDE_TITLE>Y</INCLUDE_TITLE>
    </UPDATE__CompIntfc__CI_POSITION_DATA>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

**Dept Co Update example:**

```xml
<?xml version="1.0"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <UPDATEDATA__CompIntfc__DEPARTMENT_TBL debug="Y" preserveblanks="Y" optionalKeys="Y">
      <SETID>SHARE</SETID>
      <DEPTID>2213</DEPTID>
      <EFFDT>15-JAN-25</EFFDT>
      <COMPANY>WFM</COMPANY>
    </UPDATEDATA__CompIntfc__DEPARTMENT_TBL>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

**Job Update example:**

```xml
<?xml version="1.0"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <UPDATEDATA__CompIntfc__CI_JOB_DATA debug="Y" preserveblanks="Y" optionalKeys="Y">
      <KEYPROP_EMPLID>800102</KEYPROP_EMPLID>
      <KEYPROP_EMPL_RCD>0</KEYPROP_EMPL_RCD>
      <KEYPROP_EFFDT>15-JAN-25</KEYPROP_EFFDT>
      <KEYPROP_EFFSEQ>1</KEYPROP_EFFSEQ>
      <PROP_POSITION_NBR>POS00002</PROP_POSITION_NBR>
    </UPDATEDATA__CompIntfc__CI_JOB_DATA>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

**Position Create example:**

```xml
<?xml version="1.0"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <CREATE__CompIntfc__CI_POSITION_DATA debug="Y" preserveblanks="Y" optionalKeys="Y">
      <POSITION_NBR>00000000</POSITION_NBR>
      <EFFDT>15-JAN-25</EFFDT>
      <EFF_STATUS>A</EFF_STATUS>
      <ACTION_REASON>NEW</ACTION_REASON>
      <BUSINESS_UNIT>WMH</BUSINESS_UNIT>
      <DEPTID>2213</DEPTID>
      <JOBCODE>220099</JOBCODE>
      <MAX_HEAD_COUNT>99</MAX_HEAD_COUNT>
      <UPDATE_INCUMBENTS>Y</UPDATE_INCUMBENTS>
      <REPORTS_TO>800001</REPORTS_TO>
      <LOCATION>MAIN</LOCATION>
      <MAIL_DROP>MD100</MAIL_DROP>
      <COMPANY>WFM</COMPANY>
      <STD_HOURS>40</STD_HOURS>
      <UNION_CD>NON</UNION_CD>
      <SHIFT>1</SHIFT>
      <REG_TEMP>R</REG_TEMP>
      <FULL_PART_TIME>F</FULL_PART_TIME>
      <INCLUDE_TITLE>Y</INCLUDE_TITLE>
    </CREATE__CompIntfc__CI_POSITION_DATA>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

### HTTP Request

```http
POST https://psft-server:443/psc/HRPROD/EMPLOYEE/PT_LOCAL/s/WEBLIB_SOAPTOCI.SOAPTOCI.FieldFormula.IScript_SOAPToCI?languageCd=ENG&disconnect=y&postDataBin=y HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Accept: text/xml, text/html
Accept-Charset: utf-8, iso_8859-1
userid: <peoplesoft-username>
pwd: <peoplesoft-password>

<?xml version="1.0"?>
<SOAP-ENV:Envelope ...>
  ...
</SOAP-ENV:Envelope>
```

---

## Stage 7: Response Handling

PeopleSoft returns an XML response. The `xmlParser.ts` extracts:

- **Notification code** — `'1'` = success, `'0'` = failure
- **Transaction messages** — typed as `OK`, `Warning`, or `Error`

The response is mapped to:

```typescript
interface SOAPResponse {
  success: boolean;         // notification === '1'
  notification: string;     // raw '0' or '1'
  transactions: Transaction[];
  errors: Transaction[];    // filtered type === 'Error'
  warnings: Transaction[];  // filtered type === 'Warning'
}
```

In the SmartForm store, the submission function checks two levels:

```typescript
// Level 1: Network/API error (fetch failed, 401, etc.)
if (!result.success) {
  submitFailed = true;
  errorMsg = result.error.message;
}
// Level 2: PeopleSoft CI error (invalid field, duplicate key, etc.)
else if (!result.data.success) {
  submitFailed = true;
  errorMsg = result.data.errors.map(e => e.message).join('; ');
}
```

The `PreparedSubmission` status is then set to `'success'` or `'error'` (with `errorMessage`) based on the result.

---

## Concrete Examples

### Example 1: Dept Co Update (Manager Workflow)

**Oracle row (partial):**
```
TRANSACTION_NBR: '123457'
DEPT_CO_UPDATE_CI: 'UPDATEDATA|DEPARTMENT_TBL|SETID:SHARE|DEPTID:2213|EFFDT:15-JAN-25|COMPANY:WFM'
```

**Parsed record:**
```typescript
{ transactionNbr: '123457', action: 'UPDATEDATA', ciName: 'DEPARTMENT_TBL',
  SETID: 'SHARE', DEPTID: '2213', EFFDT: '15-JAN-25', COMPANY: 'WFM' }
```

**Payload (after buildSOAPPayload with DEPT_CO_UPDATE_CI_TEMPLATE):**
```typescript
{ SETID: 'SHARE', DEPTID: '2213', EFFDT: '15-JAN-25', COMPANY: 'WFM' }
```

**API call:**
```typescript
soapApi.ci.submit('DEPARTMENT_TBL', 'UPDATEDATA', { SETID: 'SHARE', ... })
```

### Example 2: Job Update (Manager Workflow)

**Oracle row (partial):**
```
TRANSACTION_NBR: '123457'
JOB_UPDATE_CI: 'UPDATEDATA|CI_JOB_DATA|KEYPROP_EMPLID:800102|KEYPROP_EMPL_RCD:0|KEYPROP_EFFDT:15-JAN-25|KEYPROP_EFFSEQ:1|PROP_POSITION_NBR:POS00002'
```

**Parsed record:**
```typescript
{ transactionNbr: '123457', action: 'UPDATEDATA', ciName: 'CI_JOB_DATA',
  KEYPROP_EMPLID: '800102', KEYPROP_EMPL_RCD: '0',
  KEYPROP_EFFDT: '15-JAN-25', KEYPROP_EFFSEQ: '1',
  PROP_POSITION_NBR: 'POS00002' }
```

**Payload:**
```typescript
{ KEYPROP_EMPLID: '800102', KEYPROP_EMPL_RCD: '0',
  KEYPROP_EFFDT: '15-JAN-25', KEYPROP_EFFSEQ: '1',
  PROP_POSITION_NBR: 'POS00002' }
```

### Example 3: Position Create (Other Workflow)

**Oracle row (partial):**
```
TRANSACTION_NBR: '123460'
POSITION_CREATE_CI: 'CREATE|CI_POSITION_DATA|POSITION_NBR:00000000|EFFDT:15-JAN-25|EFF_STATUS:A|ACTION_REASON:NEW|BUSINESS_UNIT:WMH|DEPTID:2213|JOBCODE:220099|MAX_HEAD_COUNT:99|UPDATE_INCUMBENTS:Y|REPORTS_TO:800001|LOCATION:MAIN|MAIL_DROP:MD100|COMPANY:WFM|STD_HOURS:40|UNION_CD:NON|SHIFT:1|REG_TEMP:R|FULL_PART_TIME:F|INCLUDE_TITLE:Y'
```

**Parsed record:**
```typescript
{ transactionNbr: '123460', action: 'CREATE', ciName: 'CI_POSITION_DATA',
  POSITION_NBR: '00000000', EFFDT: '15-JAN-25', EFF_STATUS: 'A',
  ACTION_REASON: 'NEW', BUSINESS_UNIT: 'WMH', DEPTID: '2213',
  JOBCODE: '220099', MAX_HEAD_COUNT: '99', UPDATE_INCUMBENTS: 'Y',
  REPORTS_TO: '800001', LOCATION: 'MAIN', MAIL_DROP: 'MD100',
  COMPANY: 'WFM', STD_HOURS: '40', UNION_CD: 'NON', SHIFT: '1',
  REG_TEMP: 'R', FULL_PART_TIME: 'F', INCLUDE_TITLE: 'Y' }
```

---

## Dev vs. Production Branching

The SmartForm store submission functions use a three-way branch based on `isDevelopment` and `isSoapBatchMode` (both from `src/config/appMode.ts`):

```
Development mode         → simulated 400ms delay (no SOAP call)
Production + batch       → chunk records by action/batchSize, submit arrays
Production + sequential  → one-at-a-time (VITE_SOAP_BATCH_MODE=false)
```

```typescript
if (isSoapBatchMode && !isDevelopment && total > 0) {
  // --- Batch production path ---
  // Group records by action (required: submitBatch takes a single action)
  // Chunk each action group into arrays of soapBatchSize
  // Submit each chunk as an array via soapApi.ci.submit()
  // Progress jumps by chunk size (e.g., 5/20, 10/20, ...)
  // Error handling is all-or-nothing per chunk
} else {
  // --- Sequential path (development + non-batch production) ---
  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 400));
  } else {
    // Single-record SOAP submission
  }
}
```

### Batch Mode Configuration

Two compile-time constants in `src/config/appMode.ts` control batch behavior:

| Constant | Env Var | Default | Purpose |
|----------|---------|---------|---------|
| `isSoapBatchMode` | `VITE_SOAP_BATCH_MODE` | `true` | Enable/disable batch submission |
| `soapBatchSize` | `VITE_SOAP_BATCH_SIZE` | `5` | Records per HTTP request |

### Action Grouping

Records are grouped by SOAP action before chunking because `submitBatch()` takes a single `action` parameter — all records in a batch share the same SOAP action root tag. This is automatic for most templates (fixed action), but `POSITION_UPDATE_CI` has `actionIsFixed: false` and can produce `UPDATE` or `UPDATEDATA` records that must be sent in separate batches.

### Batch Error Handling

Error handling in batch mode is **all-or-nothing per chunk**: if the batch HTTP request fails or PeopleSoft returns an error, all records in that chunk are marked as `'error'`. Per-record error mapping from PeopleSoft batch responses is a future enhancement.

**Development mode** (`VITE_APP_MODE !== 'production'`):
- Mock data from `src/dev-data/smartFormMockData.ts`
- CI strings are parsed identically (same parser path)
- Submissions are simulated with `setTimeout(400)` — always succeed
- No SOAP calls are made
- Batch mode is **always ignored** in development

**Production mode** (`VITE_APP_MODE === 'production'`):
- Real Oracle query results
- CI strings parsed from Oracle data
- Real SOAP calls via `soapApi.ci.submit()`
- Two-level error checking (network + PeopleSoft CI)
- Batch or sequential mode based on `isSoapBatchMode`

---

## Error Handling Strategy

Each submission function uses a **`submitFailed` flag pattern** to ensure the workflow state machine always advances, even on error:

```typescript
let submitFailed = false;
let errorMsg = '';

// ... SOAP call with try/catch ...

// Status is set based on the flag — loop always continues
setPreparedData(prev =>
  prev.map((sub, idx) =>
    idx === i
      ? {
          ...sub,
          status: submitFailed ? 'error' : 'success',
          ...(submitFailed && { errorMessage: errorMsg }),
        }
      : sub
  )
);
```

**Why not `continue` on error?**

The last iteration of each loop has a critical step-transition (e.g., `submitting-dept-co` → `submitting-position`). An early `continue` would skip that transition and leave the workflow stuck.

**Missing CI records = success:**

Some `PreparedSubmission` entries have no matching parsed CI record (the Oracle column was `null`). These have nothing to submit, so `submitFailed` stays `false` and they're marked as successful.

---

## File Reference

| File | Role |
|------|------|
| `src/config/appMode.ts` | Batch mode config (`isSoapBatchMode`, `soapBatchSize`) |
| `src/stores/smartFormStore.ts` | Submission orchestration (5 functions, batch + sequential paths) |
| `src/server/ci-definitions/parser.ts` | CI string parsing + `buildSOAPPayload` |
| `src/server/ci-definitions/types.ts` | Typed record interfaces |
| `src/server/ci-definitions/templates/smartform/` | Template definitions (field lists) |
| `src/services/soap/soapApi.ts` | Client-side SOAP API (`soapApi.ci.submit`) |
| `src/server/soap/handlers.ts` | Server endpoint (`/api/soap/submit`) |
| `src/server/soap/soapService.ts` | SOAP service (credentials, retry, dispatch) |
| `src/server/soap/xmlBuilder.ts` | XML envelope construction |
| `src/server/soap/xmlParser.ts` | XML response parsing |
| `src/server/soap/config.ts` | PeopleSoft URL construction |
| `src/dev-data/smartFormMockData.ts` | Mock CI strings for development |
