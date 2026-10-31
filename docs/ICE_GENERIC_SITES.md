# ICE sites without a specific type

`geo/ice-facilities.csv` from dataset commit `a311796` (2026-10-20) has 21 sites whose type is empty, `OTHER` or `UNKNOWN` in the Deportation Data Project's data, and that `tools/ice-facilities.py` could not type from their code or name. The map labels them only "Site used by ICE to hold people". This file lists them so they can be checked.

The **Notes** column is inferred from the name and address only. None of it has been checked against records, and none of it is used by the map. Days, average and maximum are the dataset's counts for the past year (people held per day).

| Code | Name (as in the dataset) | Address | Dataset type | Days | Avg | Max | Field office | Notes (inferred, unverified) |
|---|---|---|---|---|---|---|---|---|
| `BIINCCO` | BI Incororated, Geo Group Company | 3130 Oakland St, Aurora, CO | UNKNOWN | 38 | 0.2 | 6 | Denver | BI Incorporated (GEO Group subsidiary) runs ICE’s alternatives-to-detention program; an office rather than a jail is likely. |
| `WALTNFL` | Walton County DOC | 691 Institution Rd., Defuniak Springs, FL | UNKNOWN | 2 | 0.0 | 1 | Miami | County corrections department: likely a county jail. |
| `FLDADCI` | Dade Correctional Institution | 19000 SW 377th St, Homestead, FL | UNKNOWN | 16 | 0.2 | 11 | Miami | Florida state prison (Florida Department of Corrections). |
| `KRHUBFL` | Krome/Miami Hub | Concourse E Satellite, Miami International, Miami, FL | OTHER | 355 | 6.5 | 54 | Miami | Airport terminal at Miami International: likely a transfer point for flights. |
| `FLDSSFS` | Florida Soft Sided Facility South | 54575 Tamiami Trail E, Ochopee, FL | (none) | 174 | 640.5 | 1727 | Miami | Address of the state-run tent facility at the Dade-Collier airfield in the Everglades. Largest of the group by population. |
| `FLBAKCI` | Baker CI | 20706 Fl-10, Sanderson, FL | UNKNOWN | 190 | 412.7 | 1037 | Miami | Florida state prison (Florida Department of Corrections). |
| `GCPFCKS` | Garden City Processing @ Finney County | 304 N. 9th St, Garden City, KS | OTHER | 6 | 0.0 | 3 | Chicago | Processing at the Finney County jail. |
| `LEXFCKY` | Lexington Processing @ Fayette County | 600 Old Frankford Cr, Lexington, KY | OTHER | 12 | 0.0 | 3 | Chicago | Processing at the Fayette County jail. |
| `STCHRLA` | St. Charles Parish Jail | 5061 La Highway 3127, Killona, LA | (none) | 3 | 0.0 | 2 | New Orleans | Parish (county) jail. |
| `HARRIMS` | Harrison Detention Center | 10451 Larkin Smith Dr, Gulfport, MS | (none) | 3 | 0.0 | 1 | New Orleans | Harrison County jail. |
| `CHMCINY` | Courthouse Usm Cntl Islip | 100 Federal Plaza, Central Islip, NY | OTHER | 11 | 0.0 | 1 | New York City | Federal courthouse, U.S. Marshals cell block. |
| `NYWASHC` | Washington Correctional | 72 Lock 11 Rd, Comstock, NY | (none) | 1 | 0.0 | 1 | Buffalo | New York state prison. |
| `NASTRNY` | Nassau County ICE Intake | 100 Carman Avenue, East Meadow, NY | UNKNOWN | 208 | 2.8 | 30 | New York City | Intake at the Nassau County jail. |
| `JFKTSNY` | JFK International Airport - T7 | Terminal 7, Jamaica, NY | OTHER | 206 | 6.7 | 23 | New York City | Airport terminal at JFK: likely a transfer point for flights. |
| `VRK` | Vrk Prcs | 201 Varick Street, New York, NY | OTHER | 103 | 1.3 | 17 | New York City | 201 Varick Street is the ICE New York field office: likely its hold room. |
| `DILLSAF` | Dilley Processing Single Female | 300 El Rancho Way, Dilley, TX | (none) | 134 | 93.6 | 399 | San Antonio | Dilley, Texas, site of ICE’s South Texas family detention center: likely a unit there. |
| `EPCPCTX` | EGP CPC Holding | 2285 Del Rio Blvd, Eagle Pass, TX | OTHER | 4 | 0.0 | 3 | San Antonio | Eagle Pass processing hold. |
| `IAHSFTX` | George Bush Intercontinental | 2800 N. Terminal Road, Houston, TX | OTHER | 3 | 0.0 | 1 | Houston | Airport at Houston (IAH): likely a transfer point for flights. |
| `ABIRJVA` | SW Virginia Regional Jail Auth-Abg Facility | 15205 Joe Derting Dr, Abingdon, VA | UNKNOWN | 59 | 1.1 | 47 | Washington | Regional jail (Southwest Virginia Regional Jail Authority). |
| `HLFRJVA` | BRRJ Halifax | 1010 Blue Ridge Lane, Halifax, VA | (none) | 2 | 0.0 | 1 | Washington | Regional jail (Blue Ridge Regional Jail Authority). |
| `LYNRJVA` | BRRJ Lynchburg | 510 9th St, Lynchburg, VA | (none) | 60 | 0.2 | 6 | Washington | Regional jail (Blue Ridge Regional Jail Authority). |

## Observations

- **Florida state prisons and the Everglades site** (`FLDADCI`, `FLBAKCI`, `FLDSSFS`) together held the most people of this group. The map's `STATE` label ("State facility used by ICE") would describe them if a record confirms state operation.
- **Airports** (`KRHUBFL`, `JFKTSNY`, `IAHSFTX`) are terminals, so the pin marks a terminal, not a building where people are held for days.
- **County, parish and regional jails** (`WALTNFL`, `STCHRLA`, `HARRIMS`, `NASTRNY`, `ABIRJVA`, `HLFRJVA`, `LYNRJVA`, and the two "Processing @ … County" sites) match no name rule because they say "DOC", "Parish", "Detention Center", "Regional Jail" or "Intake" rather than "County Jail".
- **`BIINCCO`** may not be a place of detention. The dataset records people held there (up to 6 in a day), so it stays.

## Changing a type

Do not edit the CSV by hand: it would no longer match the manifest, and the next rebuild would undo the change. Either add a rule to `tools/ice-facilities.py` (counted under `derived` in the manifest), or, for single sites, a short code-to-type list in the script (none exists yet; it would work like `MEDICAL_CODES`), each entry citing the record that supports it. Then rerun the script, review the diff and commit.

## Regenerating this list

```bash
python3 -c "import csv; [print(x['code'], x['name'], x['type'], sep=' | ') for x in csv.DictReader(open('geo/ice-facilities.csv')) if x['type'] in ('', 'OTHER', 'UNKNOWN')]"
```
