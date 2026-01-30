# CI_JOB_DATA - Full Structure Analysis

## CI Overview
- **Name:** CI_JOB_DATA
- **Description:** (empty)
- **Action:** UPDATE

## Field Type Legend
| Code | Type |
|------|------|
| 0 | Character |
| 2 | Number |
| 4 | Date |
| 5 | DateTime |
| 6 | Time |

## Level 0 (Root)

### Key Fields (2)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EMPLID | 0 | 11 | False | Empl ID |
| EMPL_RCD | 2 | 3 | False | Empl Record |

### Property Fields (17)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| ORG_INSTANCE_ERN | 2 | 3 | False | Organizational Instance |
| POI_TYPE | 0 | 5 | False | Person of Interest Type |
| BENEFIT_RCD_NBR | 2 | 3 | False | Benefit Record Number |
| HOME_HOST_CLASS | 0 | 1 | False | Home/Host Classification |
| CMPNY_DT_OVR | 0 | 1 | False | Override Company Sen. Dt |
| CMPNY_SENIORITY_DT | 4 | 10 | False | Company Seniority Date |
| SERVICE_DT_OVR | 0 | 1 | False | Override Service Date |
| SERVICE_DT | 4 | 10 | False | Service Date |
| SEN_PAY_DT_OVR | 0 | 1 | False | Override Seniority Pay Date |
| SENIORITY_PAY_DT | 4 | 10 | False | Seniority Pay Calc Date |
| PROF_EXPERIENCE_DT | 4 | 10 | False | Professional Experience Date |
| LAST_VERIFICATN_DT | 4 | 10 | False | Last Verification Date |
| PROBATION_DT | 4 | 10 | False | Probation Date |
| OWN_5PERCENT_CO | 0 | 1 | True | Owns 5% (or More) of Company |
| BUSINESS_TITLE | 0 | 30 | False | Business Title |
| POSITION_PHONE | 0 | 24 | False | Position Phone |
| POSN_CHANGE_RECORD | 0 | 1 | False | Position Management Record |

## Level 1 Collections (11 total)

### [0] RecordTypeIdentifier: 1-0-0

#### Key Fields (2)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EFFDT | 4 | 10 | True | Effective Date |
| EFFSEQ | 2 | 3 | False | Effective Sequence |

#### Property Fields (140)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| DEPTID | 0 | 10 | True | Department |
| JOBCODE | 0 | 6 | True | Job Code |
| POSITION_NBR | 0 | 8 | False | Position Number |
| SUPERVISOR_ID | 0 | 11 | False | Supervisor ID |
| HR_STATUS | 0 | 1 | True | HR Status |
| APPT_TYPE | 0 | 1 | True | Appointment Type |
| MAIN_APPT_NUM_JPN | 2 | 3 | False | Main Appointment Number |
| POSITION_OVERRIDE | 0 | 1 | True | Override Position Data |
| POSN_CHANGE_RECORD | 0 | 1 | True | Position Management Record |
| EMPL_STATUS | 0 | 1 | True | Payroll Status |
| ACTION | 0 | 3 | True | Action |
| ACTION_DT | 4 | 10 | False | Action Date |
| ACTION_REASON | 0 | 3 | False | Reason Code |
| LOCATION | 0 | 10 | False | Location Code |
| TAX_LOCATION_CD | 0 | 10 | False | Tax Location Code |
| JOB_ENTRY_DT | 4 | 10 | False | Job Entry Date |
| DEPT_ENTRY_DT | 4 | 10 | False | Department Entry Date |
| POSITION_ENTRY_DT | 4 | 10 | False | Position Entry Date |
| SHIFT | 0 | 1 | True | Regular Shift |
| REG_TEMP | 0 | 1 | True | Regular/Temporary |
| FULL_PART_TIME | 0 | 1 | True | Full/Part Time |
| COMPANY | 0 | 3 | True | Company |
| PAYGROUP | 0 | 3 | False | Pay Group |
| BAS_GROUP_ID | 0 | 3 | False | BAS Group ID |
| ELIG_CONFIG1 | 0 | 10 | False | Eligibility Config Field 1 |
| ELIG_CONFIG2 | 0 | 10 | False | Eligibility Config Field 2 |
| ELIG_CONFIG3 | 0 | 10 | False | Eligibility Config Field 3 |
| ELIG_CONFIG4 | 0 | 10 | False | Eligibility Config Field 4 |
| ELIG_CONFIG5 | 0 | 10 | False | Eligibility Config Field 5 |
| ELIG_CONFIG6 | 0 | 10 | False | Eligibility Config Field 6 |
| ELIG_CONFIG7 | 0 | 10 | False | Eligibility Config Field 7 |
| ELIG_CONFIG8 | 0 | 10 | False | Eligibility Config Field 8 |
| ELIG_CONFIG9 | 0 | 10 | False | Eligibility Config Field 9 |
| EMPL_TYPE | 0 | 1 | False | Employee Type |
| HOLIDAY_SCHEDULE | 0 | 6 | False | Holiday Schedule |
| STD_HOURS | 2 | 4.2 | False | Standard Hours |
| STD_HRS_FREQUENCY | 0 | 5 | False | Standard Work Period |
| OFFICER_CD | 0 | 1 | True | Officer Code |
| EMPL_CLASS | 0 | 3 | False | Employee Classification |
| SAL_ADMIN_PLAN | 0 | 4 | False | Salary Administration Plan |
| GRADE | 0 | 3 | False | Salary Grade |
| GRADE_ENTRY_DT | 4 | 10 | False | Grade Entry Date |
| STEP | 2 | 2 | False | Step |
| STEP_ENTRY_DT | 4 | 10 | False | Step Entry Date |
| GL_PAY_TYPE | 0 | 6 | False | General Ledger Pay Type |
| ACCT_CD | 0 | 25 | False | Combination Code |
| EARNS_DIST_TYPE | 0 | 1 | True | Earnings Distribution Type |
| COMP_FREQUENCY | 0 | 5 | True | Compensation Frequency |
| COMPRATE | 2 | 12.6 | False | Compensation Rate |
| CHANGE_AMT | 3 | 12.6 | False | Change Amount |
| CHANGE_PCT | 3 | 3.3 | False | Change Percent |
| ANNL_BENEF_BASE_RT | 2 | 15.3 | False | Annual Benefits Base Rate |
| SHIFT_RT | 2 | 12.6 | False | Shift Differential Rate |
| SHIFT_FACTOR | 2 | 1.3 | False | Shift Differential Factor |
| CURRENCY_CD | 0 | 3 | True | Currency Code |
| BUSINESS_UNIT | 0 | 5 | True | Business Unit |
| REG_REGION | 0 | 5 | True | Regulatory Region |
| DIRECTLY_TIPPED | 0 | 1 | True | Tipped |
| FLSA_STATUS | 0 | 1 | True | FLSA Status |
| EEO_CLASS | 0 | 1 | True | EEO Classification |
| FUNCTION_CD | 0 | 2 | False | Function Code |
| TARIFF_GER | 0 | 2 | False | Tariff |
| TARIFF_AREA_GER | 0 | 3 | False | Tariff Area |
| PERFORM_GROUP_GER | 0 | 2 | False | Performance Group |
| LABOR_TYPE_GER | 0 | 1 | False | Labor Type |
| SPK_COMM_ID_GER | 0 | 9 | False | Spokesmen Committee ID |
| HOURLY_RT_FRA | 0 | 3 | False | Hours Type |
| VALUE_1_FRA | 0 | 5 | False | Value 1 |
| VALUE_2_FRA | 0 | 5 | False | Value 2 |
| VALUE_3_FRA | 0 | 5 | False | Value 3 |
| VALUE_4_FRA | 0 | 5 | False | Value 4 |
| VALUE_5_FRA | 0 | 5 | False | Value 5 |
| CTG_RATE | 2 | 3 | False | Category Rate |
| PAID_HOURS | 2 | 4.2 | False | Paid Hours |
| PAID_FTE | 2 | 1.6 | False | Paid FTE |
| PAID_HRS_FREQUENCY | 0 | 5 | False | Paid Work Period |
| UNION_FULL_PART | 0 | 1 | False | Union Participation |
| UNION_POS | 0 | 1 | False | Union Position |
| MATRICULA_NBR | 2 | 5 | False | Matricula Number |
| SOC_SEC_RISK_CODE | 0 | 3 | False | Occupation Code |
| UNION_FEE_AMOUNT | 2 | 6.2 | False | Union Fee Amount |
| UNION_FEE_START_DT | 4 | 10 | False | Union Fee Start Date |
| UNION_FEE_END_DT | 4 | 10 | False | Union Fee End Date |
| EXEMPT_JOB_LBR | 0 | 1 | False | Exempted |
| EXEMPT_HOURS_MONTH | 2 | 3 | False | Exempted Hours per Month |
| WRKS_CNCL_FUNCTION | 0 | 1 | False | Works Council Function |
| INTERCTR_WRKS_CNCL | 0 | 1 | False | InterCtr.Works Cnil Function |
| CURRENCY_CD1 | 0 | 3 | False | Currency Code |
| PAY_UNION_FEE | 0 | 1 | False | Pay Union Fee |
| UNION_CD | 0 | 3 | False | Union Code |
| BARG_UNIT | 0 | 4 | False | Bargaining Unit |
| UNION_SENIORITY_DT | 4 | 10 | False | Union Seniority Date |
| ENTRY_DATE | 4 | 10 | False | Date Entered |
| LABOR_AGREEMENT | 0 | 6 | False | Labor Agreement |
| EMPL_CTG | 0 | 6 | False | Employee Category |
| EMPL_CTG_L1 | 0 | 6 | False | Employee Subcategory |
| EMPL_CTG_L2 | 0 | 6 | False | Employee Subcategory 2 |
| WPP_STOP_FLAG | 0 | 1 | True | Stop Wage Progression |
| LABOR_FACILITY_ID | 0 | 10 | False | Labor Facility ID |
| LBR_FAC_ENTRY_DT | 4 | 10 | False | Labor Facility Entry Date |
| LAYOFF_EXEMPT_FLAG | 0 | 1 | True | Exempt from Layoff |
| LAYOFF_EXEMPT_RSN | 0 | 11 | False | Layoff Exemption Reason |
| GP_PAYGROUP | 0 | 10 | False | Pay Group |
| GP_DFLT_ELIG_GRP | 0 | 1 | False | Use Pay Group Eligibility |
| GP_ELIG_GRP | 0 | 10 | False | Eligibility Group |
| GP_DFLT_CURRTTYP | 0 | 1 | False | Use Pay Group Rate Type |
| CUR_RT_TYPE | 0 | 5 | False | Exchange Rate Type |
| GP_DFLT_EXRTDT | 0 | 1 | False | Use Pay Group As Of Date |
| GP_ASOF_DT_EXG_RT | 0 | 1 | False | Use Rate As Of |
| ADDS_TO_FTE_ACTUAL | 0 | 1 | True | Adds to FTE Actual Count |
| CLASS_INDC | 0 | 1 | True | Classified/Unclassified Ind |
| ENCUMB_OVERRIDE | 0 | 1 | True | Encumbrance Override |
| FICA_STATUS_EE | 0 | 1 | False | FICA Status-Employee |
| FTE | 2 | 1.6 | False | FTE |
| PRORATE_CNT_AMT | 0 | 1 | True | Prorate Contract Change Amount |
| PAY_SYSTEM_FLG | 0 | 2 | True | Payroll System |
| BORDER_WALKER | 0 | 1 | False | Cross Border Worker |
| LUMP_SUM_PAY | 0 | 1 | True | Lump Sum Retro Payment |
| CONTRACT_NUM | 0 | 25 | False | Contract Number |
| JOB_INDICATOR | 0 | 1 | True | Job Indicator |
| BENEFIT_SYSTEM | 0 | 2 | True | Benefits System |
| WORK_DAY_HOURS | 2 | 4.2 | False | Number of Hours in a Work Day |
| NMH_ELIG_REHIRE | 0 | 1 | False | Eligibility for Rehire |
| REPORTS_TO | 0 | 8 | False | Reports To Position Number |
| JOB_DATA_SRC_CD | 0 | 3 | False | Job Source Code |
| ESTABID | 0 | 12 | False | Establishment ID |
| SUPV_LVL_ID | 0 | 8 | False | Supervisor Level |
| ABSENCE_SYSTEM_CD | 0 | 3 | False | Absence System |
| LAST_HIRE_DT | 4 | 10 | False | Last Start Date |
| TERMINATION_DT | 4 | 10 | False | Termination Date |
| LST_ASGN_START_DT | 4 | 10 | False | Last Assignment Start Date |
| ASGN_END_DT | 4 | 10 | False | Assignment End Date |
| LDW_OVR | 0 | 1 | False | Override Last Date Worked |
| LAST_DATE_WORKED | 4 | 10 | False | Last Date Worked |
| EXPECTED_RETURN_DT | 4 | 10 | False | Expected Return Date |
| EXPECTED_END_DATE | 4 | 10 | False | Expected Job End Date |
| AUTO_END_FLG | 0 | 1 | True | End Job Automatically |
| DFLT_COMP_BTN | 0 | 1 | False | Default Pay Components |
| CALC_COMP_BTN | 0 | 1 | False | Calculate Compensation |
| CMP_CHANGE_AMT_FLG | 0 | 1 | False | Change Amount Flag |

#### Sub-Collection: Level2-Collection (1-1-0)

##### Key Fields (2)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EFFDT | 4 | 10 | True | Effective Date |
| EFFSEQ | 2 | 3 | False | Effective Sequence |

##### Property Fields (87)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| LASTUPDDTTM | 6 | 26 | False | Last Update Date/Time |
| TAXCODE_UK | 0 | 15 | False | Tax Code |
| TAX_BASIS_UK | 0 | 1 | False | Tax Basis |
| BALANCE_GRP_NUM | 0 | 3 | False | Balance Group Nbr |
| FP_ACTION_2 | 0 | 3 | False | Action after Retroactive Event |
| CTG_RATE | 2 | 3 | False | Category Rate |
| FP_LEGALSTAT_CD | 0 | 3 | False | Civil Service Position Code |
| FP_SCNDMT_CD | 0 | 1 | False | Employee on Secondment |
| FP_SCND_TYP | 0 | 1 | False | Secondment Type (Int,Ext) |
| FP_CIVIL_PENSION | 0 | 1 | False | Job Leads to Civil Pension |
| FP_SOURCE_ORG | 0 | 50 | False | Home Organization |
| FP_RECEP_ORG | 0 | 30 | False | Receiving Organization |
| FP_RETURN_CD | 0 | 1 | False | Return |
| FP_PR_LEGSTA | 0 | 3 | False | Position before Return |
| FP_FOREND_DT | 4 | 10 | False | Position Expected End Date |
| FP_END_DT | 4 | 10 | False | Position Actual End Date |
| FP_CAREFRZPCT | 2 | 3 | False | Career Advancement % |
| FP_HIR_DOS_SIT | 0 | 2 | False | Hire Status |
| FP_PT_PCT_DET | 0 | 3 | False | Working Time % on Secondment |
| FP_TITLE_NUM | 0 | 10 | False | Title Number |
| FP_DURATION_PCT | 2 | 3 | False | Advancement % Service Length |
| FP_RATING_PRS_FLG | 0 | 1 | False | Rating AttendanceFlag |
| FP_BUDGET_NBR | 2 | 1 | False | Budget Headcount |
| FP_HDCNT_NBR | 2 | 1 | False | Statutory Headcount |
| FP_POTENT_NBR | 2 | 1 | False | Potential Full-Time Equivalent |
| FP_RANK_CD | 0 | 6 | False | Grade |
| FP_STEP_CD | 0 | 4 | False | Step |
| FP_RK_ENT_DT | 4 | 10 | False | Grade Entry Date |
| FP_CORPS_CD | 0 | 6 | False | Corps |
| FP_CHG_COR_DT | 4 | 10 | False | Corps Change Date |
| FP_CATG_FP | 0 | 2 | False | Civil Service Category |
| FP_CATG_LEVEL | 0 | 3 | False | Category Level |
| FP_RK_TRIALPD | 0 | 1 | False | Probation Period Grade |
| FP_STEP_END_DT | 4 | 10 | False | (Sub)Step Actual End Date |
| FP_FOR_PROM_DT | 4 | 10 | False | Expected Advancement Date |
| FP_NOMINATION_DT | 4 | 10 | False | Appointment Date |
| FP_TRAINEE | 0 | 1 | False | Trainee |
| FP_TRNE_POSN | 0 | 1 | False | Probationary Period State |
| FP_RK_PD_END_DT | 4 | 10 | False | PPd Expected End Date |
| FP_SANCTION | 0 | 1 | False | Sanction |
| FP_DOWN_GRA | 0 | 1 | False | Demotion |
| FP_APPL_SAL_DT | 4 | 10 | False | Compensation Application Date |
| FP_CHG_IND | 0 | 1 | False | Forced Index |
| FP_CLD_INST | 0 | 1 | False | Instance Terminated |
| FP_SETID_RANK | 0 | 5 | False | Set ID |
| FP_INSTALL_DT | 4 | 10 | False | Installation Date |
| FP_EQUIV_STEP | 0 | 4 | False | Corresponding Step |
| FP_STEP_CD2 | 0 | 4 | False | Derived Step |
| FP_BUSINESS_CD | 0 | 4 | False | Occupation Code |
| FP_APPL_DT | 4 | 10 | False | Application Date |
| FP_CHG_SAL | 0 | 1 | False | Forced Salary |
| FP_POINTYP_CD | 0 | 2 | False | Point Type Code |
| FP_GROSS_IND | 2 | 4 | False | Gross Index |
| FP_INCS_IND | 2 | 4 | False | Increased Index |
| FP_INCS_IND2 | 2 | 4 | False | Increased Index 2 |
| FP_PT_PCT | 0 | 3 | False | Working Time Percentage |
| FP_PT_END_DT | 4 | 10 | False | Part-Time End Date |
| FP_PT_FOREND_DT | 4 | 10 | False | PT Expected End Date |
| FP_COMPRATE | 2 | 12.6 | False | Compensation Rate |
| FP_INST_STAT | 0 | 1 | False | Instance Status |
| FP_RETROSPECT | 0 | 1 | False | Retroactivity Code |
| FP_ROW_END_DT | 4 | 10 | False | JOB Instance End Date |
| LAST_UPDATE_DATE | 4 | 10 | False | Date of last update |
| OTHER_ID_JPN | 0 | 11 | False | Internal Employee ID |
| INTCP_XFR_FLG | 0 | 1 | False | Intercompany Transfer Flag |
| INTCP_XFR_START_DT | 4 | 10 | False | Intercompany Transfer Start Dt |
| INTCP_XFR_END_DT | 4 | 10 | False | Intercompany Transfer End Date |
| INTCP_BUS_UNIT | 0 | 5 | False | Business Unit |
| INTCP_DEPTID | 0 | 10 | False | Department |
| INTCP_DEPTID2 | 0 | 10 | False | External Dept ID |
| INTCP_COMPANY | 0 | 3 | False | Intercompany Transfer Company |
| INTCP_COMPANY2 | 0 | 3 | False | External Company |
| INTCP_SUPV_LVL_ID | 0 | 8 | False | Intcmpny Transfer Supv Lvl |
| INTCP_SUPV_LVL_ID2 | 0 | 8 | False | External Supv Lvl |
| START_DATE_JPN | 4 | 10 | False | Start Date |
| EXP_END_DATE_JPN | 4 | 10 | False | Expected End Date |
| END_DATE_JPN | 4 | 10 | False | End Date |
| DUTIES_TYPE | 0 | 2 | False | Duties Type |
| TARGET_COMPRATE | 2 | 12.6 | False | Target Compensation Rate |
| CMP_DONT_ABSORB | 0 | 1 | False | Don't Absorb Changes |
| SSN_EMPLOYER | 0 | 13 | False | Social Security Number |
| WORKDAYS_NLD | 2 | 1.2 | False | Number working days per week |
| CONT_SAL_TYPE_BRA | 0 | 1 | True | Contract Salary Type |
| CBO_CD_BRA | 0 | 7 | False | Brazilian Occupation Cd |
| SEFIP_CATEGORY_BRA | 0 | 2 | True | SEFIP Category |
| UNION_CD_ALT_BRA | 0 | 3 | False | Membership Union |
| ELS_STATUS | 0 | 1 | False | Employment/Labour Std Status |

#### Sub-Collection: Level2-Collection (1-2-0)

##### Key Fields (2)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EFFDT | 4 | 10 | True | Effective Date |
| EFFSEQ | 2 | 3 | False | Effective Sequence |

##### Property Fields (11)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| MIL_SVC_COMP_CD | 0 | 4 | False | Service Component |
| MIL_CMP_CATEGORY | 0 | 4 | False | Component Category |
| JOB_FAMILY | 0 | 6 | False | Job Family |
| JOB_FUNCTION | 0 | 3 | False | Job Function Code |
| JOB_SUB_FUNC | 0 | 3 | False | Job Subfunction |
| MIL_RANK | 0 | 5 | False | Military Rank |
| MIL_RANK_ENTRY_DT | 4 | 10 | False | Rank Entry Date |
| MIL_WORN_RANK | 0 | 5 | False | Worn Rank |
| MIL_WORN_RNK_TYPE | 0 | 2 | False | Worn Rank Type |
| MIL_SKILL_GRADE | 0 | 2 | False | Skill Grade |
| LASTUPDOPRID | 0 | 30 | False | by |

#### Sub-Collection: Level2-Collection (1-3-0)

##### Key Fields (2)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EFFDT | 4 | 10 | False | Effective Date |
| EFFSEQ | 2 | 3 | False | Effective Sequence |

##### Property Fields (12)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| SALARY_PACKAGED | 0 | 1 | False | Salary Packaged |
| PAYROLL_STATE_AUS | 0 | 3 | False | Payroll Tax State |
| CLASSN_CURRENT_AUS | 2 | 3 | False | Job Classification |
| WORK_SECTOR_AUS | 0 | 1 | False | Work Sector |
| FUNCTION_AUS | 0 | 1 | False | Job Function |
| ANN_CNTACT_HRS_AUS | 2 | 4.2 | False | Annual Contact Hours |
| TEACH_WEEKS_AUS | 2 | 2 | False | Total Weeks in Teaching Job |
| CASUAL_TYPE_AUS | 0 | 1 | False | Type of Work Performed |
| TERM_TYPE_AUS | 0 | 2 | False | Type of Appointment |
| TERM_LTD_AUS | 2 | 2 | False | Appointment Duration |
| OCCUP_CG_AUS | 0 | 4 | False | Occupational Category |
| CONTRACT_INDICATOR | 0 | 1 | False | Contractor |

#### Sub-Collection: Level2-Collection (1-4-0)

##### Key Fields (2)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EFFDT | 4 | 10 | True | Effective Date |
| EFFSEQ | 2 | 3 | False | Effective Sequence |

##### Property Fields (20)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| GPS_REMUN_REG | 0 | 4 | False | Remuneration Regulation |
| GPS_JG_SC | 0 | 4 | False | Job Group/Service Class |
| GPS_JG_JOB | 0 | 4 | False | GPS Job |
| GPS_SC_GROUP | 0 | 4 | False | Service Class Group |
| GPS_BDA_DATE | 4 | 10 | False | BDA Date |
| GPS_TRANSN_STEP | 0 | 1 | True | On Transition Step |
| GPS_CSR_CD | 0 | 15 | False | Civil Service Rank Code |
| GPS_FAM_ALLOW_IND | 0 | 1 | True | Eligible for Family Allowance |
| GPS_FA_FTE_PCT | 2 | 3 | False | Family Allowance FTE Percent |
| GPS_CASE_GROUP | 0 | 4 | False | Case Group |
| GPS_PRB_PERIOD | 2 | 3 | False | Probation Period in Months |
| GPS_PRB_END_DT | 4 | 10 | False | Probation End Date |
| GPS_PRE_PERIOD | 2 | 3 | False | Pre-Service Period in Months |
| GPS_PRE_END_DT | 4 | 10 | False | Pre-Service End Date |
| GPS_NXT_GR_STEP | 2 | 2 | False | Next Grade Step |
| GPS_NXT_STEP_DT | 4 | 10 | False | Next Grade Step Date |
| GPS_PERF_STEP_DT | 4 | 10 | False | Performance Step Date |
| GPS_STEP_ACTION | 0 | 3 | False | Grade Step Action |
| GPS_STEP_ACTION_DT | 4 | 10 | False | Step Action Date |
| GPS_ALLOW_FLG | 0 | 1 | True | Allowance |

#### Sub-Collection: Level2-Collection (1-5-0)

##### Key Fields (4)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EFFDT | 4 | 10 | True | Effective Date |
| EFFSEQ | 2 | 3 | False | Effective Sequence |
| UNION_CD | 0 | 3 | False | Union Code |
| SUBCOMM_BEL | 0 | 6 | False | Subcommittee |

##### Property Fields (0)
*(none)*

#### Sub-Collection: Level2-Collection (1-6-0)

##### Key Fields (2)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EFFDT | 4 | 10 | True | Effective Date |
| EFFSEQ | 2 | 3 | False | Effective Sequence |

##### Property Fields (4)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| MEMBER_STATUS_IND | 0 | 1 | True | Membership Status |
| CATEGORY | 0 | 10 | False | Category Name |
| POSITION_HELD_IND | 0 | 15 | False | Position Held |
| COMMENTS | 1 | 0 | False | Comment |

#### Sub-Collection: Level2-Collection (1-7-0)

##### Key Fields (4)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EFFDT | 4 | 10 | True | Effective Date |
| EFFSEQ | 2 | 3 | False | Effective Sequence |
| COMP_EFFSEQ | 2 | 3 | False | Compensation Eff Sequence |
| COMP_RATECD | 0 | 6 | True | Comp Rate Code |

##### Property Fields (13)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| COMP_RATE_POINTS | 2 | 5 | False | Comp Rate Points |
| COMPRATE | 2 | 12.6 | False | Compensation Rate |
| COMP_PCT | 2 | 3.3 | False | Comp Percent |
| COMP_FREQUENCY | 0 | 5 | False | Compensation Frequency |
| CURRENCY_CD | 0 | 3 | False | Currency Code |
| MANUAL_SW | 0 | 1 | False | Manual Row Switch |
| CONVERT_COMPRT | 2 | 12.6 | False | Converted Comp Rate |
| RATE_CODE_GROUP | 0 | 6 | False | Rate Code Group Name |
| CHANGE_AMT | 3 | 12.6 | False | Change Amount |
| CHANGE_PCT | 3 | 3.3 | False | Change Percent |
| CHANGE_PTS | 3 | 5 | False | Change Points |
| FTE_INDICATOR | 0 | 1 | True | Apply FTE for Annualization |
| CMP_SRC_IND | 0 | 1 | False | Rate Code Source |

#### Sub-Collection: Level2-Collection (1-8-0)

##### Key Fields (11)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EFFDT | 4 | 10 | True | Effective Date |
| EFFSEQ | 2 | 3 | False | Effective Sequence |
| POSITION_NBR | 0 | 8 | False | Position Number |
| BUSINESS_UNIT | 0 | 5 | False | Business Unit |
| DEPTID | 0 | 10 | False | Department |
| JOBCODE | 0 | 6 | False | Job Code |
| GL_PAY_TYPE | 0 | 6 | False | General Ledger Pay Type |
| ACCT_CD | 0 | 25 | False | Combination Code |
| SHIFT | 0 | 1 | False | Regular Shift |
| LOCATION | 0 | 10 | False | Location Code |
| ERNCD | 0 | 3 | True | Earnings Code |

##### Property Fields (3)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| COMPRATE | 2 | 12.6 | False | Compensation Rate |
| DIST_PCT | 2 | 3.3 | False | Percent of Distribution |
| STD_HOURS | 2 | 4.2 | False | Standard Hours |

#### Sub-Collection: Level2-Collection (1-9-0)

##### Key Fields (2)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EFFDT | 4 | 10 | False | Effective Date |
| EFFSEQ | 2 | 3 | False | Effective Sequence |

##### Property Fields (121)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| GVT_EFFDT | 4 | 10 | False | Effective Date |
| GVT_EFFDT_PROPOSED | 4 | 10 | False | Proposed Effective Date |
| GVT_TRANS_NBR | 2 | 1 | False | Transaction Nbr |
| GVT_TRANS_NBR_SEQ | 2 | 1 | False | Sequence |
| GVT_WIP_STATUS | 0 | 3 | False | Work-in-Progress Status |
| GVT_STATUS_TYPE | 0 | 3 | False | Status Type |
| GVT_NOA_CODE | 0 | 3 | False | Nature of Action Code |
| GVT_LEG_AUTH_1 | 0 | 3 | False | Legal Authority (1) |
| GVT_PAR_AUTH_D1 | 0 | 25 | False | Authority 1 Descr - Part 1 |
| GVT_PAR_AUTH_D1_2 | 0 | 25 | False | Authority 1 Descr - Part 2 |
| GVT_LEG_AUTH_2 | 0 | 3 | False | Legal Authority (2) |
| GVT_PAR_AUTH_D2 | 0 | 25 | False | Authority 2 Descr - Part 1 |
| GVT_PAR_AUTH_D2_2 | 0 | 25 | False | Authority 2 Descr - Part 2 |
| GVT_PAR_NTE_DATE | 4 | 10 | False | Not-to-Exceed Date |
| GVT_WORK_SCHED | 0 | 1 | False | Work Schedule |
| GVT_SUB_AGENCY | 0 | 2 | False | Sub-Agency |
| GVT_ELIG_FEHB | 0 | 3 | False | Eligible for FEHB |
| GVT_FEHB_DT | 4 | 10 | False | FEHB Eligibility Date |
| GVT_PAY_RATE_DETER | 0 | 1 | False | Pay Rate Determinant |
| GVT_STEP | 0 | 2 | False | US Federal Step |
| GVT_RTND_PAY_PLAN | 0 | 2 | False | Retained Pay Plan |
| GVT_RTND_SAL_PLAN | 0 | 4 | False | Retained Pay Table |
| GVT_RTND_GRADE | 0 | 3 | False | Retained Grade |
| GVT_RTND_STEP | 2 | 2 | False | Retained Step |
| GVT_RTND_GVT_STEP | 0 | 2 | False | Retained US Federal Step |
| GVT_PAY_BASIS | 0 | 2 | False | Pay Basis |
| GVT_COMPRATE | 2 | 12.6 | False | Base Pay |
| GVT_LOCALITY_ADJ | 2 | 5.2 | False | Locality Adjustment |
| GVT_BIWEEKLY_RT | 2 | 7.2 | False | Biweekly Rate |
| GVT_DAILY_RT | 2 | 7.2 | False | Daily Rate |
| GVT_HRLY_RT_NO_LOC | 2 | 12.6 | False | Hourly Rate with out Location |
| GVT_DLY_RT_NO_LOC | 2 | 7.2 | False | Daily Rate No Locality |
| GVT_BW_RT_NO_LOC | 2 | 7.2 | False | No Locality Biweekly Rate |
| GVT_MNLY_RT_NO_LOC | 2 | 15.3 | False | No Locality Monthly Rate |
| GVT_ANNL_RT_NO_LOC | 2 | 15.3 | False | No Locality Annual Rate |
| GVT_XFER_FROM_AGCY | 0 | 2 | False | Transferred From Agency |
| GVT_XFER_TO_AGCY | 0 | 2 | False | Transferred To Agency |
| GVT_RETIRE_PLAN | 0 | 2 | False | Retirement Plan |
| GVT_ANN_IND | 0 | 1 | False | Annuitant Indicator |
| GVT_FEGLI | 0 | 2 | False | FEGLI Code |
| GVT_FEGLI_LIVING | 0 | 1 | False | FEGLI Living Benefits |
| GVT_LIVING_AMT | 2 | 8 | False | Living Benefit Coverage Amount |
| GVT_ANNUITY_OFFSET | 2 | 8 | False | CSRS Annuity Offset Amount |
| GVT_CSRS_FROZN_SVC | 0 | 4 | False | CSRS Frozen Service |
| GVT_PREV_RET_COVRG | 0 | 1 | False | Previous Retirement Coverage |
| GVT_FERS_COVERAGE | 0 | 1 | False | FERS Coverage |
| GVT_TYPE_OF_APPT | 0 | 2 | False | Type of Appointment |
| GVT_POI | 0 | 4 | False | Personnel Office ID |
| GVT_POSN_OCCUPIED | 0 | 1 | False | Position Occupied |
| GVT_CONT_EMPLID | 0 | 11 | False | Contact Emplid |
| GVT_ROUTE_NEXT | 0 | 11 | False | Route to Next |
| GVT_CHANGE_FLAG | 0 | 1 | False | Change Flag |
| GVT_TSP_UPD_IND | 0 | 1 | False | TSP Status |
| GVT_PI_UPD_IND | 0 | 1 | False | PI upd ind |
| GVT_SF52_NBR | 0 | 10 | False | SF-52 Request Number |
| GVT_S113G_CEILING | 0 | 1 | False | SF-113G Ceiling |
| GVT_LEO_POSITION | 0 | 1 | False | LEO/Fire Position |
| GVT_ANNUIT_COM_DT | 4 | 10 | False | Annuity Commencement Date |
| GVT_BASIC_LIFE_RED | 0 | 2 | False | Post 65 Basic Life Reduction |
| GVT_DED_PRORT_DT | 4 | 10 | False | 4 Day Date |
| GVT_FEGLI_BASC_PCT | 2 | 1.6 | False | FEGLI Basic Percent |
| GVT_FEGLI_OPT_PCT | 2 | 1.6 | False | FEGLI Optional Percent |
| GVT_FEHB_PCT | 2 | 1.6 | False | FEHB % |
| GVT_RETRO_FLAG | 0 | 1 | False | Retro Pay Flag |
| GVT_RETRO_DED_FLAG | 0 | 1 | False | Retro Ded Flag |
| GVT_RETRO_JOB_FLAG | 0 | 1 | False | Retro Job Flag |
| GVT_RETRO_BSE_FLAG | 0 | 1 | False | Retro Base Flag |
| GVT_OTH_PAY_CHG | 0 | 1 | False | Other Pay Change Flag |
| GVT_DETL_POSN_NBR | 0 | 8 | False | Govt Detail Position Number |
| ANNL_BEN_BASE_OVRD | 0 | 1 | False | Annl Benefit Base Rt Override |
| BENEFIT_PROGRAM | 0 | 3 | False | Benefit Program |
| UPDATE_PAYROLL | 0 | 1 | False | Update Payroll Flags |
| GVT_PAY_PLAN | 0 | 2 | False | Pay Plan |
| GVT_PAY_FLAG | 0 | 1 | False | GVT_PAY_FLAG |
| GVT_NID_CHANGE | 0 | 1 | False | GVT_NID_CHANGE |
| GVT_SCD_RETIRE | 4 | 10 | False | Service Comp Date - Retire |
| GVT_SCD_TSP | 4 | 10 | False | Service Comp Date - TSP |
| GVT_SCD_LEO | 4 | 10 | False | Service Comp Date - LEO |
| GVT_SCD_SEVPAY | 4 | 10 | False | Service Comp Date - Sev Pay |
| GVT_SEVPAY_PRV_WKS | 2 | 2 | False | Severance Pay Previous Weeks |
| GVT_MAND_RET_DT | 4 | 10 | False | Mandatory Retirement Date |
| GVT_WGI_STATUS | 0 | 1 | False | Current WGI Status |
| GVT_INTRM_DAYS_WGI | 2 | 3 | False | Intermittent Days Worked |
| GVT_NONPAY_NOA | 0 | 3 | False | NonPay Nature of Action - Last |
| GVT_NONPAY_HRS_WGI | 2 | 4.2 | False | Non-Pay Hours WGI |
| GVT_NONPAY_HRS_SCD | 2 | 4.2 | False | Non-Pay Hours for SCD |
| GVT_NONPAY_HRS_TNR | 2 | 4.2 | False | Career Tenure Hours |
| GVT_NONPAY_HRS_PRB | 2 | 4.2 | False | Non-Pay Hours for Probation |
| GVT_TEMP_PRO_EXPIR | 4 | 10 | False | Temp Promotion Expires |
| GVT_TEMP_PSN_EXPIR | 4 | 10 | False | Temporary Posn Change Expires |
| GVT_DETAIL_EXPIRES | 4 | 10 | False | Date Detail Expires |
| GVT_SABBATIC_EXPIR | 4 | 10 | False | Date Sabbatical Expires |
| GVT_RTND_GRADE_BEG | 4 | 10 | False | Retained Grade Begins |
| GVT_RTND_GRADE_EXP | 4 | 10 | False | Retained Grade Expires |
| GVT_CURR_APT_AUTH1 | 0 | 3 | False | Current Appointment Auth Nbr 1 |
| GVT_CURR_APT_AUTH2 | 0 | 3 | False | Current Appointment Auth Nbr 2 |
| GVT_APPT_EXPIR_DT | 4 | 10 | False | Appointment Expiration Date |
| GVT_CNV_BEGIN_DATE | 4 | 10 | False | Conv Begin Date |
| GVT_CAREER_CNV_DUE | 4 | 10 | False | Conversion to Career Due |
| GVT_CAREER_COND_DT | 4 | 10 | False | Career-Cond Conv Date |
| GVT_APPT_LIMIT_HRS | 2 | 4 | False | Appointment Limit in Hours |
| GVT_APPT_LIMIT_DYS | 2 | 3 | False | Appointment Limit in Days |
| GVT_APPT_LIMIT_AMT | 2 | 6 | False | Appointment Limit Amount |
| GVT_SUPV_PROB_DT | 4 | 10 | False | Supv/Manager Probation Date |
| GVT_SES_PROB_DT | 4 | 10 | False | SES Probation Date |
| GVT_SEC_CLR_STATUS | 0 | 1 | False | Security Clearance Status |
| GVT_CLRNCE_STAT_DT | 4 | 10 | False | Security Clearance Status Date |
| GVT_ERN_PGM_PERM | 0 | 2 | False | Permanent Pay Plan - RIF |
| GVT_OCC_SERS_PERM | 0 | 4 | False | Permanent Occ Series - RIF |
| GVT_GRADE_PERM | 0 | 3 | False | Permanent Grade - RIF |
| GVT_COMP_AREA_PERM | 0 | 2 | False | Comp/Area Level |
| GVT_COMP_LVL_PERM | 0 | 3 | False | Permanent Comp Level - RIF |
| GVT_SPEP | 0 | 2 | False | Special Employment Program |
| GVT_WGI_DUE_DATE | 4 | 10 | False | Within-Grade Increase Due Date |
| GVT_DT_LEI | 4 | 10 | False | Date Last Equivalent Increase |
| GVT_FIN_DISCLOSURE | 0 | 1 | False | Financial Disclosure Required |
| GVT_FIN_DISCL_DATE | 4 | 10 | False | Financial Disclosure Due Date |
| GVT_TENURE | 0 | 1 | False | Highest Career Tenure |
| GVT_DETL_BARG_UNIT | 0 | 4 | False | Govt Detail Bargaining Unit |
| GVT_DETL_UNION_CD | 0 | 3 | False | Govt Detail Union Code |
| GVT_WELFARE_WK_CD | 0 | 2 | False | Welfare to Work |

### [1] RecordTypeIdentifier: 2-0-0

#### Key Fields (2)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| COBRA_EVENT_ID | 2 | 3 | False | COBRA Event Identification |
| EFFDT | 4 | 10 | True | Effective Date |

#### Property Fields (1)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| BENEFIT_PROGRAM | 0 | 3 | True | Benefit Program |

### [2] RecordTypeIdentifier: 3-0-0

#### Key Fields (1)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EFFDT | 4 | 10 | True | Effective Date |

#### Property Fields (17)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| TIME_RPTG_STATUS | 0 | 1 | True | Time Reporter Status |
| TIME_RPTR_IND | 0 | 1 | True | Time Reporter Type |
| ELP_TR_TMPLT_ID | 0 | 10 | False | Elapsed Reporting Template |
| PCH_TR_TMPLT_ID | 0 | 10 | False | Punch Reporting Template |
| PERIOD_ID | 0 | 12 | False | Time Period ID |
| WORKGROUP | 0 | 10 | True | Workgroup |
| TASKGROUP | 0 | 10 | True | Taskgroup |
| TASK_PROFILE_ID | 0 | 10 | False | Task Profile ID |
| TCD_GROUP_ID | 0 | 10 | False | TCD Group ID |
| RESTRICTION_PRF_ID | 0 | 10 | False | Restriction Profile ID |
| TL_TIME_TO_PAY | 0 | 1 | True | Send Time to Payroll |
| RULE_ELEMENT_1 | 0 | 10 | False | Rule Element 1 |
| RULE_ELEMENT_2 | 0 | 10 | False | Rule Element 2 |
| RULE_ELEMENT_3 | 0 | 10 | False | Rule Element 3 |
| RULE_ELEMENT_4 | 0 | 10 | False | Rule Element 4 |
| RULE_ELEMENT_5 | 0 | 10 | False | Rule Element 5 |
| TIMEZONE | 0 | 9 | False | Time Zone |

### [3] RecordTypeIdentifier: 4-0-0

#### Property Fields (5)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| ORIG_HIRE_OVR | 0 | 1 | False | Override Original Start DT |
| ORIG_HIRE_DT | 4 | 10 | False | Original Start Date |
| ORG_INST_SRV_OVR | 0 | 1 | False | Override Org Instance Service |
| ORG_INST_SRV_DT | 4 | 10 | False | Org Instance Service Date |
| NEE_PROVIDER_ID | 0 | 10 | False | Provider ID |

### [4] RecordTypeIdentifier: 5-0-0

#### Property Fields (3)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| INT_APP_TYPE | 0 | 3 | True | Integration Application Type |
| INTEGR_PROD_CD | 0 | 3 | True | Integration Product |
| ENROLLED_FLAG | 0 | 1 | True | Enrolled |

### [5] RecordTypeIdentifier: 6-0-0

#### Property Fields (3)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| INS_DAYS_BRA | 0 | 2 | False | INSS Days |
| INS_MONTHS_BRA | 0 | 2 | False | INSS Months |
| INS_YEARS_BRA | 0 | 2 | False | INSS Years |

### [6] RecordTypeIdentifier: 7-0-0

#### Property Fields (5)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| TENURE_ACCR_FLG | 0 | 1 | False | Accrue Tenure Services |
| FTE_TENURE | 2 | 1.2 | False | FTE for Tenure Accrual |
| EG_GROUP | 0 | 6 | False | Service Calculation Group |
| FTE_FLX_SRVC | 2 | 1.2 | False | FTE for Flex Service Accrual |
| APPOINT_END_DT | 4 | 10 | False | Appointment End Date |

### [7] RecordTypeIdentifier: 8-0-0

#### Property Fields (1)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| EDUC_LVL_AD_BTD | 4 | 10 | False | Educ Lvl -Adjusted Birth Date |

### [8] RecordTypeIdentifier: 9-0-0

#### Property Fields (3)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| FA_PAY_PROGRAM | 0 | 3 | False | Festive Advance Pay Program |
| FA_TYPE | 0 | 3 | True | FA Holiday Type |
| FA_ELIG_DT | 4 | 10 | False | Festive Advance Eligible From |

### [9] RecordTypeIdentifier: 10-0-0

#### Property Fields (1)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| RELAT_TO_OWNER_NLD | 0 | 1 | False | Relation to Owner |

### [10] RecordTypeIdentifier: 11-0-0

#### Key Fields (1)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| CONTRACT_NUM | 0 | 25 | False | Contract Number |

#### Property Fields (32)
| Field | Type | Length | Required | Label |
|-------|------|--------|----------|-------|
| CONTRACT_BEGIN_DT | 4 | 10 | False | Contract Begin Date |
| CONTRACT_END_DT | 4 | 10 | False | Contract End Date |
| SIGNATURE_DT | 4 | 10 | False | Signature Date |
| CONTRACT_STATUS | 0 | 1 | True | Contract Status |
| ADD_CONTRACT | 0 | 1 | False | Additional Contract |
| CNT_MIN_HRS | 2 | 3.2 | False | Minimum Hours Per Contract |
| CNT_MAX_HRS | 2 | 3.2 | False | Maximum Hours Per Contract |
| RESPONSIBLE_ID | 0 | 11 | False | Responsible ID |
| YEAR_SW | 0 | 1 | False | More than one year expected |
| COMMENTSHORT | 0 | 30 | False | Comment |
| CNT_TEMPLATE_ID | 0 | 11 | False | Contract Template ID |
| CNT_RSZ_SUBM_BEL | 0 | 1 | False | RSZ-Submitted |
| CNT_RSZ_CAT_BEL | 0 | 3 | False | RSZ-Category |
| RED_CHRG_CAT_BEL | 0 | 6 | False | Reduced Charges Category |
| REDCH_STARTDT_BEL | 4 | 10 | False | Reduced Charges Start Date |
| REDCH_ENDDT_BEL | 4 | 10 | False | Reduce Charge End Date |
| SOCIAL_BALANCE_BEL | 0 | 3 | False | Social Balance Category |
| BEGIN_WEEKDAY | 0 | 1 | False | Begin/End Week |
| END_WEEKDAY | 0 | 1 | False | End Day of Week |
| HIRE_CTR_CD_ESP | 0 | 3 | False | Hiring Center |
| COMP_RATE_DESCR | 0 | 100 | False | Compensation Rate Description |
| PROBATION_PERIOD | 2 | 3 | False | Probation Period |
| DURATION_TYPE | 0 | 1 | False | Type of Duration |
| VACATION_PERIOD | 2 | 3 | False | Vacation Period |
| VACN_PERIOD_UNIT | 0 | 1 | False | Vacation Period Type |
| SCHEME_ID_ESP | 0 | 4 | False | Scheme ID |
| CONTRIB_ID_ESP | 0 | 5 | False | Social Security Contribution |
| CONTRCT_EXP_END_DT | 4 | 10 | False | Contract Expected End Date |
| REG_REGION | 0 | 5 | True | Regulatory Region |
| NEE_PROVIDER_ID | 0 | 10 | False | Provider ID |
| WAIVE_COMPLIANCE | 0 | 1 | False | Waive Working Time Compliance |
| COMMENTS | 1 | 0 | False | Comment |
