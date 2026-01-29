# ExcelToCI Template Generation Logging Guide

This document describes how to add detailed logging to the **Build New Template** functionality in ExcelToCI, allowing you to capture and analyze the SOAP request/response data from PeopleSoft.

---

## Overview

By default, when you check "Generate Log" and build a new template, the `debug="Y"` flag is sent to PeopleSoft but **no client-side log file is created**. The changes below add comprehensive logging for template generation.

---

## Files to Modify

| File | Module Name | Purpose |
|------|-------------|---------|
| `5_6_vba_code\Modules\CreateCITemplate.txt` | CreateCITemplate | Contains template generation logic |

---

## Change #1: Add the Logging Function

### Location
**File**: `CreateCITemplate.txt`
**Insert After**: Line 894 (after the `buildSOAPRequest` function ends)

### Code to Add

```vba
''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
'Function:      writeTemplateLog
'Arguments:     sResponse -- the SOAP response from the server
'               sError -- optional error message
'Purpose:       This function saves the SOAP request and response to log files for analysis
''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
Function writeTemplateLog(ByVal sResponse As String, Optional sError As String = "")
    Dim sFileName As String
    Dim sRequestFile As String
    Dim sTempDir As String
    Dim iFileNum As Integer
    Dim sTimestamp As String

    ' Only log if Generate Log checkbox is checked
    If frmLogin.chkGenerateLog = True Then
        ' Get temp directory
        sTempDir = Environ("TEMP")
        If sTempDir = "" Then
            sTempDir = "c:\temp"
        End If

        ' Create timestamp for unique filename
        sTimestamp = Format(Now, "yyyymmdd_hhmmss")

        ' === Save the SOAP Response ===
        sFileName = sTempDir & "\ExcelToCI_Template_" & Login.sCIName & "_" & sTimestamp & "_RESPONSE.xml"

        iFileNum = FreeFile
        Open sFileName For Output As #iFileNum

        ' Write header information as XML comments
        Print #iFileNum, "<?xml version=""1.0"" encoding=""UTF-8""?>"
        Print #iFileNum, "<!-- ============================================== -->"
        Print #iFileNum, "<!-- ExcelToCI Template Generation - SOAP Response -->"
        Print #iFileNum, "<!-- ============================================== -->"
        Print #iFileNum, "<!-- Generated: " & Now & " -->"
        Print #iFileNum, "<!-- Component Interface: " & Login.sCIName & " -->"
        Print #iFileNum, "<!-- Server URL: " & Login.sRequest & " -->"
        Print #iFileNum, "<!-- User ID: " & sUserID & " -->"
        If sError <> "" Then
            Print #iFileNum, "<!-- ERROR: " & sError & " -->"
        End If
        Print #iFileNum, "<!-- ============================================== -->"
        Print #iFileNum, ""

        ' Write the raw XML response
        Print #iFileNum, sResponse

        Close #iFileNum

        ' === Save the SOAP Request ===
        sRequestFile = sTempDir & "\ExcelToCI_Template_" & Login.sCIName & "_" & sTimestamp & "_REQUEST.xml"

        iFileNum = FreeFile
        Open sRequestFile For Output As #iFileNum

        Print #iFileNum, "<!-- ============================================= -->"
        Print #iFileNum, "<!-- ExcelToCI Template Generation - SOAP Request -->"
        Print #iFileNum, "<!-- ============================================= -->"
        Print #iFileNum, "<!-- Generated: " & Now & " -->"
        Print #iFileNum, "<!-- Component Interface: " & Login.sCIName & " -->"
        Print #iFileNum, "<!-- Server URL: " & Login.sRequest & " -->"
        Print #iFileNum, "<!-- ============================================= -->"
        Print #iFileNum, ""
        Print #iFileNum, sSOAPRequest

        Close #iFileNum

        ' === Create a combined summary log ===
        Dim sSummaryFile As String
        sSummaryFile = sTempDir & "\ExcelToCI_Template_" & Login.sCIName & "_" & sTimestamp & "_SUMMARY.log"

        iFileNum = FreeFile
        Open sSummaryFile For Output As #iFileNum

        Print #iFileNum, "========================================================"
        Print #iFileNum, "  ExcelToCI Template Generation Summary"
        Print #iFileNum, "========================================================"
        Print #iFileNum, ""
        Print #iFileNum, "Timestamp:           " & Now
        Print #iFileNum, "Component Interface: " & Login.sCIName
        Print #iFileNum, "Server URL:          " & Login.sRequest
        Print #iFileNum, "User ID:             " & sUserID
        Print #iFileNum, ""
        Print #iFileNum, "--------------------------------------------------------"
        Print #iFileNum, "  Files Generated"
        Print #iFileNum, "--------------------------------------------------------"
        Print #iFileNum, "Request:  " & sRequestFile
        Print #iFileNum, "Response: " & sFileName
        Print #iFileNum, "Summary:  " & sSummaryFile
        Print #iFileNum, ""
        Print #iFileNum, "--------------------------------------------------------"
        Print #iFileNum, "  Response Statistics"
        Print #iFileNum, "--------------------------------------------------------"
        Print #iFileNum, "Response Length: " & Len(sResponse) & " characters"
        If sError <> "" Then
            Print #iFileNum, "Error: " & sError
        Else
            Print #iFileNum, "Status: Success"
        End If
        Print #iFileNum, ""
        Print #iFileNum, "========================================================"

        Close #iFileNum

        ' Notify user where logs were saved
        MsgBox "Template logs saved to:" & vbCrLf & vbCrLf & _
               "Response: " & sFileName & vbCrLf & vbCrLf & _
               "Request: " & sRequestFile & vbCrLf & vbCrLf & _
               "Summary: " & sSummaryFile, _
               vbInformation, "Template Log Saved"
    End If
End Function
```

---

## Change #2: Call the Logging Function (Option A - After Processing)

### Location
**File**: `CreateCITemplate.txt`
**Function**: `buildNewTemplate`
**Line**: 268 (after `processSOAPResponse_GetCIShape` is called)

### Original Code (around lines 267-270)
```vba
    'Process the returned XML
    processSOAPResponse_GetCIShape

End Function
```

### Modified Code
```vba
    'Process the returned XML
    processSOAPResponse_GetCIShape

    ' Save the SOAP request/response for analysis
    writeTemplateLog sSOAPResponse

End Function
```

---

## Change #2: Call the Logging Function (Option B - Capture All Cases Including Errors)

### Location
**File**: `CreateCITemplate.txt`
**Function**: `sendSOAPRequest_GetCIShape`
**Line**: 848 (after `sSOAPResponse` is assigned)

### Original Code (around lines 847-858)
```vba
        xHTTP.send xDoc.xml
        sSOAPResponse = xHTTP.responseText
        If sSOAPResponse = "" Then
            'The URL was not found
            sendSOAPRequest_GetCIShape = -1
        Else
            sendSOAPRequest_GetCIShape = 0
        End If
    Else
        Call PSMsgBox(sMsgInvalidXML2, "sendSOAPRequest_GetCIShape")
        'Login.clearLogin
        sendSOAPRequest_GetCIShape = 1
    End If
```

### Modified Code
```vba
        xHTTP.send xDoc.xml
        sSOAPResponse = xHTTP.responseText

        ' Log the response regardless of success/failure
        writeTemplateLog sSOAPResponse

        If sSOAPResponse = "" Then
            'The URL was not found
            sendSOAPRequest_GetCIShape = -1
        Else
            sendSOAPRequest_GetCIShape = 0
        End If
    Else
        Call PSMsgBox(sMsgInvalidXML2, "sendSOAPRequest_GetCIShape")
        'Login.clearLogin
        sendSOAPRequest_GetCIShape = 1
    End If
```

---

## Output Files

When "Generate Log" is checked and you build a new template, three files will be created:

| File Pattern | Contents |
|--------------|----------|
| `ExcelToCI_Template_<CIName>_<timestamp>_REQUEST.xml` | The SOAP request sent to PeopleSoft |
| `ExcelToCI_Template_<CIName>_<timestamp>_RESPONSE.xml` | The SOAP response from PeopleSoft |
| `ExcelToCI_Template_<CIName>_<timestamp>_SUMMARY.log` | Human-readable summary with metadata |

### Example Output Location
```
C:\Users\<username>\AppData\Local\Temp\ExcelToCI_Template_JOB_DATA_20260128_143025_REQUEST.xml
C:\Users\<username>\AppData\Local\Temp\ExcelToCI_Template_JOB_DATA_20260128_143025_RESPONSE.xml
C:\Users\<username>\AppData\Local\Temp\ExcelToCI_Template_JOB_DATA_20260128_143025_SUMMARY.log
```

---

## How to Apply These Changes

### Step 1: Export the VBA Module
1. Open the Excel workbook containing ExcelToCI
2. Press `Alt + F11` to open the VBA Editor
3. Find `CreateCITemplate` in the Project Explorer
4. Right-click → Export File → Save as backup

### Step 2: Add the New Function
1. Open the `CreateCITemplate` module in the VBA Editor
2. Scroll to the end of the `buildSOAPRequest` function (after line 894)
3. Paste the `writeTemplateLog` function code from Change #1

### Step 3: Add the Function Call
1. Choose either Option A or Option B from Change #2
2. Navigate to the specified line
3. Add the `writeTemplateLog sSOAPResponse` call

### Step 4: Test
1. Save the workbook
2. Go to the Template sheet
3. Click "Build New Template"
4. Check the "Generate Log" checkbox
5. Enter credentials and Component Interface name
6. Click OK
7. Check your `%TEMP%` folder for the generated log files

---

## Troubleshooting

### Log files not appearing?
- Verify "Generate Log" checkbox is checked in the login dialog
- Check that `%TEMP%` folder exists (run `echo %TEMP%` in Command Prompt)
- Ensure you have write permissions to the temp folder

### Empty response file?
- The server may have returned an empty response
- Check the summary file for error information
- Verify network connectivity to the PeopleSoft server

### Permission errors?
- Try running Excel as Administrator
- Check if antivirus is blocking file creation
- Verify the temp folder path is writable

---

## Notes

- The `FreeFile` function is used to get the next available file handle, preventing conflicts with other file operations
- The timestamp in filenames ensures each template generation creates unique files
- XML comments are used in the response/request files so they remain valid XML and can be opened in XML viewers
- The `sSOAPRequest` and `sSOAPResponse` variables are module-level, making them accessible from the new function
