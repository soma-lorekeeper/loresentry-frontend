export const PRIVACY_EN = `
In providing the novel editor Lore Sentry, the SOMA Lore Sentry team (the “Operator”) processes
member information and the information entered by users as set out below.

## 1. Purposes of processing, items processed and how they are collected

| Purpose of processing | Items processed | How collected |
|---|---|---|
| Identifying and linking members via their Google account | Google account identifier, login provider, internal service user identifier | Google login requested by the user and creation of the service account |
| Displaying and managing account information and giving key service notices | Email, display name, account creation and modification times | Google login, the user’s edits to the display name, generated during use of the service |
| Verifying login requests | Login request identifier and request verification information, creation and expiry times | Generated during the login process |
| Continuing the terms consent process after authentication | Internal service user identifier, pending-consent identification information, version of the terms concerned, creation and expiry times | Generated and temporarily stored after Google authentication is completed |
| Maintaining and protecting login status | Session identification information linked to the account and its creation and expiry information | Generated during login and authenticated use of the service |
| Confirming consent to the Terms of Service | User identifier, version of the terms agreed to and time of consent | Generated when the user agrees to the terms |
| Saving, editing and restoring novels | Project names and descriptions, document titles, body text, properties and relations, document versions, trash status, link to the owning account | The user’s input and use of the editor |
| Uploading and displaying images | Uploaded images, file name, type and size, storage location and upload status, project link information | The user’s uploads |
| Maintaining the workspace | Notes, favorites, workspace settings | The user’s input and settings |
| Requested novel analysis | Manuscripts to be analyzed and the analysis results generated from them, such as characters, relationships, events and summaries | Requested by the user pressing the analysis button |
| Handling inquiries and the exercise of rights | Reply email, inquiry content, account verification information needed to handle the request, and the outcome | Inquiry email and the inquiry feature where provided |

After Google authentication, an account is created or looked up, and the account information is kept
even if the user closes the screen without agreeing to the terms. Expiry of pending-consent
information does not mean the account is deleted.

Google may not provide an email or a name. The name is used to set the initial display name, and the
user can change the display name. Profile images and image URLs are not stored as member
information. If the text of a novel contains information that can identify a real individual, that
part may also become subject to personal information processing.

The Google account identifier is used to identify members. The email address is used as the
account’s contact address and for notices of major changes to the terms and of service termination,
and the display name is used to show the account within the service. On re-login, the email address
provided by Google is updated, but the display name set by the user is not overwritten with the
Google name. Sending emails for advertising or marketing is not currently within the scope of
operation.

## 2. Legal basis for processing personal information

Personal information needed to identify and authenticate members and to provide the sign-up and
editor features the user requests is processed on the basis of entering into and performing a
contract under
[Article 15(1)(4) of the Personal Information Protection Act](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029335387).
If processing outside that scope becomes necessary, a lawful basis will be established, and where
consent is required, separate consent will be obtained after informing the user of the purpose,
items, retention period and the consequences of refusing.

Consent to the Terms of Service and consent to the collection and use of personal information are
separate from each other. This policy is a document that discloses how personal information is
processed, and viewing the policy is not in itself deemed to be separate consent.

## 3. Retention periods and destruction

| Information | Retention period and destruction criteria |
|---|---|
| Member account and Google connection information | Kept for as long as the account is held, and destroyed without delay when the purpose of processing ends, such as on withdrawal. Requests are received through the procedure in Article 7 of the Terms of Service |
| Google login request information | Up to 5 minutes after creation. Consumed once when the request is processed |
| Pending-consent information | Up to 30 minutes from creation. Consumed once when consent is completed; if the screen is closed, it expires after the remaining period. Not extended by lookups |
| Login session information | Expires 14 days after the last authentication activity; extended on activity. The session is revoked on logout, and the account’s sessions are revoked on withdrawal |
| Terms consent records | Kept for as long as the account is held, and deleted together with the account on withdrawal |
| Manuscripts, document versions, images, analysis results and workspace information | Kept for as long as the user keeps them. Moving to the trash is storage for restoration; on a request for permanent deletion or withdrawal, the information in that scope is deleted without delay |
| Backups of member accounts and manuscripts | No separate backups are operated |
| Content and outcomes of inquiries and rights requests | Kept until the request has been handled and answered, and deleted without delay once the purpose of processing ends. If retention is needed, such as for an ongoing dispute, the basis and period are communicated separately |

Information whose retention purpose has ended is destroyed so that it cannot be recovered or
reproduced, after confirming what it covers and any retention exceptions. When a work is permanently
deleted, the document versions, images and analysis results linked to its text are cleaned up along
with it. On withdrawal, the account, Google connection information, consent records and the
manuscripts, document versions, images, analysis results and workspace information of all projects
are deleted without delay, with no separate recovery grace period, and login sessions and pending
consent requests are revoked. Document versions and the trash are restoration features of the
editor, not separate backups for disaster recovery. For copies held by external processors, the
retention periods and deletion conditions disclosed for that processor apply.

There is currently no payment feature, so no purchase or payment history is collected. If
information is identified that must be retained separately under other laws, the law, items, purpose
and period concerned will be disclosed, and that information will be stored separately from general
service use information.

## 4. Novel text and external AI analysis

The Operator provides features for saving and editing the user’s manuscripts and for analyzing them
into an easy-to-understand form. Manuscripts and analysis results are not disclosed to other users
or used for the Operator’s advertising, sales or model training.

When a user requests analysis by pressing the analysis button, the text of the novel to be analyzed
is sent to the OpenAI API. Saving a manuscript alone does not trigger automatic analysis. The
member’s email address, display name, Google account identifier, service user ID and login
authentication information are not sent with it. However, since the text itself may contain
information that identifies a real individual, this is reviewed separately from account information.

OpenAI API data is not used for model training by default, and the Operator does not permit optional
data sharing for training. However, under standard API settings, abuse-monitoring logs that may
include inputs and outputs are retained for up to 30 days by default, and there are exceptions for
legal requirements or for protecting the service or third parties. Depending on the API features,
models and settings, response state or caches may also be retained separately.

The operating goal is for external providers to retain no manuscripts or analysis results. The
actual conditions will be communicated after confirming whether Zero Data Retention (ZDR) is
approved and applied, and the retention exceptions of the models and features used. Turning off
response storage alone does not eliminate all retention, and zero retention is not currently
guaranteed. A setup with processing in the United States is under consideration, but the country of
processing is not determined to be the United States merely because OpenAI is used.

Basis of review:
[OpenAI’s official data policies](https://developers.openai.com/api/docs/guides/your-data), checked
2026-09-29. At launch, this will be checked again against the actual account settings and contract.

## 5. Provision to third parties, outsourcing of processing and overseas transfer

Providing member information and manuscripts to third parties for advertising or sales is not within
the scope of service operation. Where an external provider processes information to provide the
service, whether this is outsourced processing or provision to a third party is determined according
to the actual contract and purpose of processing. Where personal information is processed overseas,
the legal basis and details of that transfer are communicated.

The following is based on a setup that uses the providers below. The contracting entities and
contact details, each provider’s retention period, and the specific countries and legal basis for
overseas transfers will be reflected in the published version after the actual operating conditions
are confirmed.

| Provider / service | Purpose and scope of processing | Storage and transfer locations: what has been confirmed |
|---|---|---|
| Amazon Web Services (AWS) | Running servers, storing member and editor data and images, delivering the website and images | Per the storage settings, RDS, Neptune and the image S3 are in the Seoul region, Republic of Korea. This does not mean that CloudFront delivery and cache locations are limited to Korea |
| Cloudflare | Relaying and protecting API connections | Included in the connection path. The actual proxy, log and region settings need to be confirmed in the account |
| OpenAI API | Analysis of manuscripts requested by the user | Text is sent to the API when the analysis button is pressed. The country of processing and retention period require confirmation of the actual applicable conditions described in Section 4 |
| Google Analytics (Google LLC) | Analysis of service usage statistics | Visited pages, device, approximate location and usage behavior information are sent to Google. Countries of processing, such as the United States, follow the conditions published by Google |

Google is the login provider chosen by the user. The account identifier, email and name received
through Google authentication are used for the purposes in Section 1, and novel text is not sent to
the Google login API.

If no analysis is run, that manuscript transfer to OpenAI does not take place. This choice is
separate from processing by the infrastructure providers used for accessing and storing the service.

Where separate consent is required for an overseas transfer of personal information, that consent is
obtained separately before the transfer.

## 6. Cookies and browser storage

The service uses cookies to link Google login requests, for the terms consent process and to
maintain login status.

Users can block or delete cookies in their browser settings. If essential authentication cookies are
blocked, the login or sign-up process cannot continue.

| Cookies in the production environment | Purpose | Lifetime |
|---|---|---|
| \`__Host-ls_oauth\` | Linking the Google login request and callback | Up to 5 minutes |
| \`__Host-ls_session\` | Maintaining login status | Up to 14 days. Renewed on authentication activity |
| \`__Host-ls_consent\` | Pending terms consent after authentication | Up to 30 minutes from creation. Deleted when consent is completed |

Authentication cookies are set so that browser scripts cannot read them. Theme and editor settings
are stored in the browser and are removed when site data is deleted. In development and demo modes,
demo manuscripts and connection settings may also remain in the browser. Withdrawing membership on
the server does not also delete data stored in the browser.

To improve the service, usage statistics are collected with Google Analytics.

| Analytics cookie | Purpose | Lifetime |
|---|---|---|
| \`_ga\` | Distinguishing visitors | Up to 2 years |
| \`_ga_<measurement ID>\` | Maintaining the visit session | Up to 2 years |

The items collected are the addresses of pages visited, device and browser information, approximate
location at the country and city level, referral source, and usage behavior such as scrolling and
clicks on external links. Project and file identifiers are removed from page addresses before they
are sent, and manuscripts, emails and display names are not sent. Information stored in Google
Analytics is deleted once the retention period set by the Operator (up to 14 months) has passed.
Google signals data for advertising purposes and ads personalization are not used.

Users can refuse this collection by blocking cookies in their browser settings or by installing the
[Google Analytics opt-out browser add-on](https://tools.google.com/dlpage/gaoptout), and refusing
does not limit their use of the service. No advertising tools have been adopted.

## 7. Users’ rights and how to exercise them

Users may request access to, correction or deletion of, and suspension of the processing of their
personal information, and where any processing is based on consent, they may withdraw that consent.
Requests made through a representative, such as a legal representative, are handled after a
procedure that verifies the identity of the user and the representative’s authority.

Requests are received at the inquiry email in Section 9, and if an in-service contact feature is
provided, they can also be submitted through that feature. The procedures for deleting accounts and
manuscripts and for withdrawal and export follow
[Article 7 of the Terms of Service](/policies/terms/#article-7). After the necessary identity
verification, the Operator handles the request in accordance with the law and informs the user of
the outcome. If there is a reason to limit a request, such as information that must be retained
under other laws, the reason and how to object are communicated.

The service is intended for users aged 14 or older, and sign-up or use by anyone under 14 is not
permitted.

## 8. Measures to protect personal information

HTTPS is used for communication between the browser and the service. Authentication cookies have
script-access restrictions and security attributes applied, and the origin of requests that change
account state is checked. The server restricts access to editor data by confirming that the
requesting account is the owner of the project.

Direct external access to the authentication server is restricted, and credentials and request
bodies are managed so that they are not exposed in error-diagnostic logs. The Operator’s data access
permissions and the protection settings for storage and logs are managed to fit the actual operating
environment.

## 9. Privacy inquiries and complaints

- Operator: SOMA Lore Sentry team
- Person in charge of personal information protection and complaints: SOMA Lore Sentry team. Inquiries and deletion requests are received and handled by the person responsible for the email below.
- Email for privacy inquiries and deletion requests: \`tmdwn0509@gmail.com\`
- How to exercise rights or file an objection: the inquiry email above or, if an in-service contact feature is provided, that feature. Requests can be submitted by email even if the user cannot log in.

## 10. Changes to this policy

When this policy is changed, notice is given so that the changes and the effective date can be
checked in the service, and the previous version is made available. Changes that require separate
consent, such as a change in the purpose of processing, go through the relevant consent procedure.

- Initial effective date: to be set and displayed at first publication and application.
- Document version: Draft 0.3
- Previous versions: can be requested at the inquiry email in Section 9.
`;
