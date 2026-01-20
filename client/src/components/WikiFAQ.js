import { useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField,
    InputAdornment,
    Tabs,
    Tab,
    Chip,
    Divider,
    Card,
    CardContent,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import QueueIcon from "@mui/icons-material/Queue";
import PhoneIcon from "@mui/icons-material/Phone";
import SettingsIcon from "@mui/icons-material/Settings";
import GroupIcon from "@mui/icons-material/Group";
import ArticleIcon from "@mui/icons-material/Article";
import DashboardIcon from "@mui/icons-material/Dashboard";
import RouteIcon from "@mui/icons-material/AltRoute";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";

// ============================================
// FAQ DATA - Organized by Category
// ============================================
const faqData = {
    dashboard: [
        {
            question: "What metrics are shown on the Dashboard?",
            answer: `The Dashboard displays real-time call center metrics:
• **Waiting Calls**: Calls currently in queue waiting for an agent
• **Talking Calls**: Active calls with agents
• **Available Agents**: Agents ready to take calls
• **Answered Calls**: Total calls answered today
• **Abandoned Calls**: Calls where caller hung up before being answered
• **Average Wait Time**: Mean time callers spend in queue
• **Average Talk Time**: Mean call duration
• **Service Level**: Percentage of calls answered within target time`,
        },
        {
            question: "How often does the Dashboard update?",
            answer:
                "Dashboard metrics update in real-time via WebSocket connection. You will see a green indicator when connected. If disconnected, try refreshing the page.",
        },
        {
            question: "What is the Agent Availability section?",
            answer:
                "Shows all agents with their current status (Available, On Call, Paused, Offline). Click on an agent to view their details or monitor their call.",
        },
    ],
    queues: [
        {
            question: "What are Voice Queues?",
            answer:
                "Voice Queues are holding areas for incoming calls that are answered by a group of agents. When a call comes in, it is placed in the queue and distributed to available agents based on the configured strategy.",
        },
        {
            question: "What is an Agent Penalty and how does it work?",
            answer: `Agent Penalty determines the priority order for call distribution:
• **Penalty 0**: Highest priority - called first
• **Penalty 1**: Called when penalty 0 agents are busy
• **Penalty 2+**: Backup agents - called when lower penalty agents are unavailable

**Use Cases**:
• Tiered support: Junior agents (0) first, seniors (1+) as backup
• Skill-based routing: Specialists (0) for complex issues
• Overflow: Primary team (0), other departments (1+) during peak`,
            highlight: true,
        },
        {
            question: "What queue strategies are available?",
            answer: `**Ring All**: Rings all available agents simultaneously - fastest answer time

**Round Robin Memory**: Remembers the last agent who answered, starts from next agent - fair distribution

**Least Recent**: Rings the agent who has been idle the longest - balances workload

**Fewest Calls**: Rings the agent who has taken the fewest calls - balances call count

**Random**: Randomly selects an available agent - unpredictable but fair

**Ring In Order**: Rings agents in the order added to queue - predictable routing`,
        },
        {
            question: "How do I configure Queue Settings?",
            answer: `Navigate to **Voice > Voice Queues** and click on a queue:

**General Settings**:
• **Name**: Queue identifier (no spaces, used in dialplan)
• **Strategy**: Call distribution method
• **Timeout**: Seconds to ring each agent (recommended: 15-30)
• **Retry**: Seconds before retrying agents (recommended: 5)
• **Wrapup Time**: Post-call delay before next call (0-60 seconds)
• **Max Length**: Maximum callers allowed in queue (0 = unlimited)

**Music on Hold**: Audio played while callers wait
**Announcements**: Periodic messages to callers`,
        },
        {
            question: "How do I add/remove agents from a queue?",
            answer: `1. Go to **Voice > Voice Queues**
2. Click on the queue name
3. Click **Add Agent** button
4. Select agents from the Available list
5. Set individual **Penalty** values for each agent
6. Click **Commit Changes**

**Bulk Operations**:
• Use **>>** to add all available agents
• Use **<<** to remove all associated agents`,
        },
        {
            question: "What does Wrapup Time do?",
            answer:
                "Wrapup Time adds a delay (in seconds) after an agent completes a call before they receive another. This gives agents time for post-call tasks like notes, follow-ups, or system updates. Typical values: 5-30 seconds.",
        },
    ],
    agents: [
        {
            question: "How do I create a new agent?",
            answer: `1. Go to **Staff > Agents**
2. Click **Add Agent**
3. Fill required fields:
   • **Username**: Login name
   • **Extension**: Phone number (e.g., 1001)
   • **Password**: Initial password
4. Configure optional settings in tabs
5. Click **Save**`,
        },
        {
            question: "What are the Agent Edit tabs?",
            answer: `**Account Tab**: Basic info (name, email, extension, role)

**Voice Tab**: SIP/Telephony settings
• Transport (UDP/TCP/TLS)
• Codecs (audio formats)
• NAT settings
• DTMF mode

**Other Channels**: Email, SMS integrations

**Phonebar**: Desktop softphone settings
• Auto-answer configuration
• Ringtone selection
• Hotkeys

**Dialplan**: View extension routing rules

**Security**: Password management`,
        },
        {
            question: "What Voice settings should I configure?",
            answer: `**Essential Settings**:
• **Transport**: Usually UDP (default), use TLS for encryption
• **Context**: Set to "from-internal" for internal calls
• **NAT**: Enable if agent is behind router/firewall

**Codec Priority** (recommended order):
1. G.722 (HD audio)
2. ULAW (G.711 - standard quality)
3. ALAW (European standard)
4. GSM (low bandwidth)

**DTMF Mode**: RFC4733 recommended (works with most systems)`,
        },
        {
            question: "How do I reset an agent password?",
            answer: `1. Go to **Staff > Agents**
2. Click on the agent
3. Go to **Security** tab
4. Click **Reset Password**
5. Enter and confirm new password
6. Click **Submit**

The agent will need to use the new password on next login.`,
        },
        {
            question: "How do I pause/unpause an agent?",
            answer:
                "Go to **Voice > Realtime**. Find the agent and click the pause/play button. Paused agents remain logged in but will not receive queue calls. Use this for breaks, meetings, or training.",
        },
    ],
    trunks: [
        {
            question: "What are SIP Trunks?",
            answer:
                "SIP Trunks connect your phone system to external networks (PSTN or VoIP providers). They handle outgoing calls to external numbers and receive incoming calls from outside.",
        },
        {
            question: "How do I configure a SIP Trunk?",
            answer: `Go to **Tools > Trunks** and click **Add** or edit existing:

**Settings Tab**:
• **Name**: Trunk identifier
• **Type**: PJSIP (recommended)
• **Host**: Provider IP or domain
• **Username/Password**: Authentication credentials
• **Context**: Usually "from-trunk" for inbound

**Advanced Tab**:
• **Transport**: UDP/TCP/TLS
• **Codecs**: Match provider requirements
• **Registration**: Enable if provider requires
• **Qualify**: Enable for health monitoring`,
        },
        {
            question: "What trunk settings does my provider need?",
            answer: `Ask your SIP provider for:
• **SIP Server Address** (Host)
• **SIP Port** (usually 5060)
• **Username and Password**
• **Supported Codecs**
• **Whether registration is required**
• **Any specific caller ID requirements**
• **Outbound proxy (if any)**`,
        },
    ],
    routes: [
        {
            question: "What are Inbound Routes?",
            answer: `Inbound Routes control how incoming calls are handled based on:
• **DID Number**: The number that was called
• **Caller ID Pattern**: Who is calling
• **Time Conditions**: Business hours vs after-hours

Each route directs calls to a destination (queue, extension, IVR, voicemail).`,
        },
        {
            question: "How do I create an Inbound Route?",
            answer: `1. Go to **Voice > Inbound Routes**
2. Click **Add Route**
3. Configure:
   • **DID Pattern**: Number or pattern (e.g., 2567XXXXXXX)
   • **Caller ID Pattern**: Optional filter
   • **Destination**: Where to send calls
4. Set priority (lower = higher priority)
5. Save the route`,
        },
        {
            question: "What are Outbound Routes?",
            answer: `Outbound Routes determine how outgoing calls are placed:
• **Dial Pattern**: What numbers match this route
• **Trunk**: Which connection to use
• **Caller ID**: What number to display

Example: Route all numbers starting with "0" through the main trunk.`,
        },
        {
            question: "How do dial patterns work?",
            answer: `Dial patterns use special characters:
• **X**: Any digit 0-9
• **Z**: Any digit 1-9
• **N**: Any digit 2-9
• **[123]**: Match 1, 2, or 3
• **.**: Match one or more characters
• **|**: Prefix to strip

**Examples**:
• NXXNXXXXXX - US 10-digit
• 0XXXXXXXXX - Local with leading 0
• 00. - International (00 + any)`,
        },
    ],
    recordings: [
        {
            question: "Where are call recordings stored?",
            answer:
                "Recordings are stored on the server and accessible via **Voice > Recordings**. They can be played in-browser or downloaded as audio files.",
        },
        {
            question: "How do I enable call recording?",
            answer: `Recording can be enabled at multiple levels:

**Queue Level**: Edit queue settings and enable recording
**Route Level**: Enable in inbound route settings
**Extension Level**: Configure in agent voice settings

Recordings are saved in WAV or MP3 format based on system configuration.`,
        },
        {
            question: "How do I search recordings?",
            answer: `Go to **Voice > Recordings** and use filters:
• **Date Range**: Select start and end dates
• **Queue**: Filter by specific queue
• **Agent**: Filter by agent extension
• **Caller ID**: Search by caller number
• **Duration**: Filter by call length`,
        },
    ],
    monitoring: [
        {
            question: "What is Call Monitoring (ChanSpy)?",
            answer: `Call Monitoring allows supervisors to listen to live calls:

**Listen Mode** (Silent): Hear both parties, neither knows you are listening. Use for quality assurance.

**Whisper Mode**: Speak to agent only, caller cannot hear. Use for real-time coaching.

**Barge Mode**: Speak to both parties (3-way call). Use for escalation or assistance.`,
            highlight: true,
        },
        {
            question: "How do I monitor a call?",
            answer: `1. Go to **Voice > Call Monitoring**
2. View list of active calls
3. Click the monitoring icon on a call
4. Select mode (Listen/Whisper/Barge)
5. Your phone will ring - answer to start monitoring
6. Hang up to end monitoring session`,
        },
        {
            question: "What is the Realtime view?",
            answer: `**Voice > Realtime** shows live system status:

**Queue Status**: Calls waiting, agents available per queue
**Agent Status**: Each agent with current state
• Available (green)
• On Call (blue)
• Paused (yellow)
• Offline (gray)

**Live Calls**: All active calls with duration and status`,
        },
    ],
    ivr: [
        {
            question: "What is an IVR?",
            answer:
                "IVR (Interactive Voice Response) is an automated phone menu. Callers hear options and press digits to navigate (e.g., Press 1 for Sales, Press 2 for Support).",
        },
        {
            question: "How do I create an IVR?",
            answer: `1. Go to **IVR > IVR Projects**
2. Click **Create New**
3. Design your call flow:
   • Add **Play Audio** nodes for prompts
   • Add **Menu** nodes for options
   • Connect to destinations (queues, extensions)
4. Save and assign to an inbound route`,
        },
    ],
    integrations: [
        {
            question: "What integrations are available?",
            answer: `**Salesforce**: Sync contacts, log calls automatically
**WhatsApp**: Business messaging integration
**ODBC**: Connect to external databases for dynamic routing`,
        },
        {
            question: "How do I set up WhatsApp?",
            answer: `1. Go to **Integrations > WhatsApp**
2. Connect your WhatsApp Business account
3. Configure message templates
4. Assign agents to handle WhatsApp messages`,
        },
    ],
    settings: [
        {
            question: "What are Networks?",
            answer:
                "**Settings > Networks** configures network interfaces and SIP binding addresses. Important for multi-homed servers or specific network routing requirements.",
        },
        {
            question: "How do I manage my license?",
            answer: `Go to **Settings > License** to:
• View current license status
• See available features
• Check concurrent user limit
• View license expiration date
• Request license updates`,
        },
        {
            question: "What are Time Intervals?",
            answer: `**Tools > Intervals** defines business hours and schedules:
• Create named intervals (e.g., "Business Hours")
• Set days and times
• Use in inbound routes for time-based routing
• Route calls differently after hours`,
        },
    ],
    tickets: [
        {
            question: "What are Ticket Forms?",
            answer: `Ticket Forms are dynamic forms that agents can fill during or after calls to capture customer information, issues, and resolutions.

**Key Features**:
• Admin-defined custom fields (text, dropdowns, checkboxes, etc.)
• Automatic call linking (caller ID, call ID, timestamp)
• Agent-to-form assignments (control who sees which forms)
• Ticket status workflow (Draft → Submitted → Reviewed → Closed)
• Caller history lookup (view previous tickets from same caller)
• Optional Google Forms/Sheets sync for external data collection
• Agent read-only view of their submitted tickets ("My Tickets" tab)`,
            highlight: true,
        },
        {
            question: "How does the Ticket System architecture work?",
            answer: `The Ticket System has **3 main components**:

**1. Admin UI (Client Dashboard)**
• Create and configure ticket forms with custom fields
• Set up Google Forms integration (sync submissions externally)
• Assign agents to specific forms
• View all ticket submissions in a searchable table
• Route: \`/tools/ticket-forms\` and \`/ticket-submissions?formId=X\`

**2. Electron Softphone (Agent App)**
• **Fill Tickets Tab**: Active forms assigned to the agent for filling during calls
• **My Tickets Tab**: Read-only view of agent's own submitted tickets
• Automatic caller number capture during active calls
• Local form validation before submission
• Dynamic form rendering (text, dropdowns, checkboxes, etc.)

**3. Backend Server**
• Sequelize models: \`TicketForm\`, \`TicketSubmission\`, \`TicketFormAgent\`
• REST API endpoints under \`/api/tickets/\`
• Google Forms API integration for external sync
• Real-time form updates via WebSocket`,
            highlight: true,
        },
        {
            question: "How do I create a Ticket Form?",
            answer: `1. Go to **Tools > Ticket Forms** in the Admin UI
2. Click **Create Form**
3. Configure the **Settings** tab:
   • Form name and description
   • Active/Inactive toggle
   • Optional Google Sheet ID for export
   • Optional Google Form URL for sync
4. Add fields in the **Fields** tab:
   • Click **Add Field**
   • Select field type (text, dropdown, checkbox, etc.)
   • Set label, placeholder, and required status
   • For dropdowns/radios: add options
5. Click **Save Form**

**Important**: Forms must be marked as **Active** and have **agents assigned** for them to appear in the Electron softphone.`,
        },
        {
            question: "What field types are available?",
            answer: `**8 Field Types** (rendered by \`DynamicFormField.jsx\`):

• **Short Text**: Single-line text input
• **Long Text**: Multi-line textarea
• **Dropdown**: Select from predefined options
• **Radio Buttons**: Single choice from options
• **Checkboxes**: Multiple choice from options
• **Date**: Date picker (uses MUI DatePicker)
• **Number**: Numeric input with optional min/max validation
• **Scale/Rating**: Slider for ratings (e.g., 1-5, 1-10)

**Label Formatting**: All field labels are automatically normalized to sentence case (first letter capitalized, rest lowercase) for professional display.`,
        },
        {
            question: "How do I assign agents to a form?",
            answer: `**In Admin UI**:
1. Go to **Tools > Ticket Forms** and click on a form
2. Navigate to the **Agent Assignment** tab
3. Use the dual-list interface:
   • **Left list**: Available agents (not assigned)
   • **Right list**: Assigned agents
   • Click an agent to move between lists
   • Use **>>** to add all agents at once
   • Use **<<** to remove all agents at once
4. Click **Save Assignments**

**Database**: Assignments stored in \`ticket_form_agents\` table linking \`formId\` to \`agentId\`.

**Important**: Only assigned agents will see the form in their Electron softphone's "Fill Tickets" tab. Agents not assigned will not see the form at all.`,
        },
        {
            question: "How does the Electron Softphone ticket workflow work?",
            answer: `**Agent Workflow in Softphone (\`TicketFormsView.jsx\`)**:

**FILL TICKETS TAB**:
1. Agent receives a call → softphone shows active call info
2. Agent clicks **Tickets** button → opens TicketFormsView
3. **Fill Tickets** tab shows forms assigned to this agent
4. Agent selects a form → dynamic fields render
5. Agent fills in the form fields
6. **Caller number is auto-captured** from active call (\`currentCall.remoteIdentity\`)
7. Agent clicks **Submit** → form validated → sent to backend
8. Submission stored with: agentId, formId, responses, callerNumber, status

**MY TICKETS TAB** (Read-Only):
1. Agent clicks **My Tickets** tab
2. Shows all tickets previously submitted by this agent
3. **Search/Filter**: By caller number, form name, or status
4. **Card View**: Each ticket shows form name, status chip, caller, timestamp
5. **View Details**: Click eye icon → dialog shows all field values
6. **No editing allowed**: Google Forms cannot be edited after submission

**Call Linking**:
When a call is active, the \`currentCall\` prop contains:
• \`callId\`: Unique call identifier
• \`callerNumber\`: Remote identity / phone number
• \`timestamp\`: Call start time

This data is automatically included in the ticket submission.`,
            highlight: true,
        },
        {
            question: "Why can't agents edit submitted tickets?",
            answer: `**Tickets are READ-ONLY after submission** for these reasons:

1. **Google Forms Limitation**: The Google Forms API does not support editing existing responses programmatically. Once a form response is submitted, it cannot be modified via API.

2. **Data Integrity**: Prevents accidental or unauthorized changes to historical records.

3. **Audit Trail**: Maintains accurate record of what was recorded at time of submission.

**Agent View ("My Tickets" tab)**:
• Agents can view all their submitted tickets
• Can search by caller number, form name, or status
• Can click "View Details" to see all field values
• **Cannot edit, delete, or modify** any submitted ticket

**Admin Capability**:
• Administrators can update ticket **status** (submitted → reviewed → closed)
• View all submissions in **Ticket Submissions** page
• Export data via Google Sheets integration`,
        },
        {
            question: "How does Google Forms integration work?",
            answer: `**Overview**: The system can sync ticket submissions to an external Google Form, creating a backup in Google's infrastructure and enabling Google Forms' built-in analytics.

**SETUP PROCESS**:

**Step 1: Create a Google Form**
• Go to \`forms.google.com\` and create a new form
• Add fields that match your ticket form fields
• **Important**: Form must be set to "Anyone with the link can respond"

**Step 2: Get the Form URL**
• Click **Send** button in Google Forms
• Copy the form link (ends with \`/viewform\`)
• Example: \`https://docs.google.com/forms/d/e/1FAIpQL.../viewform\`

**Step 3: Configure in Admin UI**
• Go to **Tools > Ticket Forms** → Edit your form
• Enable **"Sync submissions to Google Form"** toggle
• Paste the complete Google Form URL
• Click **Fetch Fields** button

**Step 4: Field Mapping**
The system fetches all fields from the Google Form and displays them. Auto-mapping automatically detects:
• **Caller Number** → Fields containing "phone", "caller", "number", "contact"
• **Agent Extension** → Fields containing "agent", "extension", "operator"
• **Call ID** → Fields containing "call id", "reference", "ticket"
• **Timestamp** → Fields containing "date", "time", "when"

Blue chips indicate which call data will auto-fill which Google Form fields.

**Step 5: Save and Test**
• Save the form configuration
• Have an agent submit a test ticket
• Verify the submission appears in both the database AND Google Forms responses

**TECHNICAL DETAILS** (\`googleFormsService.js\`):
• Uses Google Forms API to fetch form structure
• Uses Google Forms API to submit responses programmatically
• Service account authentication via credentials file
• Responses appear in Google Forms as normal submissions`,
            highlight: true,
        },
        {
            question: "What about Google Sheets export vs Google Forms sync?",
            answer: `**Two Different Integrations**:

**1. Google Sheets Export** (Database → Spreadsheet):
• Exports ticket data to a Google Spreadsheet
• Requires: Sheet ID in form configuration
• Data flows: Database → Google Sheets
• Use for: Reporting, data analysis, sharing with stakeholders
• Updates append new rows to the spreadsheet

**2. Google Forms Sync** (Agent → Google Form):
• Submits responses directly to a Google Form
• Requires: Google Form URL in form configuration
• Data flows: Agent Submission → Database + Google Form
• Use for: Capturing data in Google's ecosystem, using Google Forms analytics
• Creates actual form responses in Google Forms

**Can I use both?**
Yes! You can configure a form to:
• Store submissions in the database
• Export to Google Sheets
• Sync to Google Forms
All three can work simultaneously.`,
        },
        {
            question: "How do I view ticket submissions in Admin UI?",
            answer: `**Ticket Submissions Page** (\`/ticket-submissions?formId=X\`):

**Accessing the Page**:
1. Go to **Tools > Ticket Forms**
2. Click **View Submissions** button on any form
3. Opens the submissions table for that form

**Table Features**:
• **Dynamic Columns**: Shows ID, Status, Submitted date, plus form field values
• **Up to 5 fields shown inline** (additional fields require click to view details)
• **Clickable rows**: Click any row to open full details dialog
• **Search**: Filter by caller number
• **Pagination**: 10, 25, or 50 rows per page
• **Sticky header**: Column headers remain visible while scrolling

**View Details Dialog**:
• Shows all submission metadata (status, caller, timestamp)
• Shows all form field values in a table format
• Field names displayed in sentence case

**Status Workflow**:
Submissions flow through: Draft → Submitted → Reviewed → Closed`,
        },
        {
            question: "How does call linking work?",
            answer: `**Automatic Call Data Capture**:

When an agent fills a ticket during an **active call**, the system automatically captures:

| Field | Source | Description |
|-------|--------|-------------|
| **Caller Number** | \`currentCall.remoteIdentity\` | Phone number of the caller |
| **Call ID** | \`currentCall.callId\` | Unique identifier for call recording lookup |
| **Agent ID** | Logged-in agent | The agent handling the call |
| **Timestamp** | Auto-generated | When the ticket was submitted |

**How It Works** (\`Appbar.jsx\` → \`TicketFormsView.jsx\`):
1. \`Appbar.jsx\` tracks call state via SIP.js
2. When call is active, it passes \`currentCall\` object to TicketFormsView
3. TicketFormsView includes \`callerNumber: currentCall.callerNumber\` in submission
4. If no active call, \`callerNumber\` is null (shows as "N/A")

**In Admin Submissions View**:
• Caller number is displayed in the table
• Can search/filter by caller number
• Links tickets to specific calls for reference`,
        },
        {
            question: "What is the ticket status workflow?",
            answer: `Tickets follow a **4-stage workflow**:

| Status | Description | Who Sets It |
|--------|-------------|-------------|
| **Draft** | Saved but not submitted | Agent (auto-saved) |
| **Submitted** | Agent completed and submitted | Agent (on submit) |
| **Reviewed** | Supervisor reviewed | Admin (manual) |
| **Closed** | Ticket fully processed | Admin (manual) |

**Status Colors** (UI display):
• Draft: Gray (default)
• Submitted: Blue (primary)
• Reviewed: Green (success)
• Closed: Purple (secondary)

**Agent View**: Can only see their own tickets, cannot change status
**Admin View**: Can see all tickets, can update status via submissions page`,
        },
        {
            question: "How do I view caller history?",
            answer: `**Caller History** allows viewing all previous tickets from the same phone number.

**In Electron Softphone**:
When an agent is on a call or viewing tickets:
• System looks up tickets by caller number
• Shows previous submissions from same caller
• Helps agents understand caller's history

**In Admin UI (\`/ticket-submissions\`)**:
1. Go to **Tools > Ticket Forms**
2. Click **View Submissions** on any form
3. Use the **Search by caller number** field
4. Enter phone number (partial match supported)
5. Table filters to show only matching submissions

**API Endpoint**: 
\`GET /api/tickets/caller/:phoneNumber\` returns all tickets for a caller`,
        },
        {
            question: "What are the backend API endpoints?",
            answer: `**Ticket Forms Endpoints** (\`/api/tickets/forms\`):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/forms\` | List all forms |
| GET | \`/forms/:id\` | Get single form details |
| POST | \`/forms\` | Create new form |
| PUT | \`/forms/:id\` | Update form |
| DELETE | \`/forms/:id\` | Delete form |
| GET | \`/forms/agent/:agentId\` | Get forms assigned to agent |
| GET | \`/forms/:id/agents\` | Get agents assigned to form |
| POST | \`/forms/:id/agents\` | Assign agents to form |

**Ticket Submissions Endpoints** (\`/api/tickets/submissions\`):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/submissions\` | List submissions (with filters) |
| GET | \`/submissions/:id\` | Get single submission |
| POST | \`/submissions\` | Create new submission |
| PUT | \`/submissions/:id\` | Update submission |
| DELETE | \`/submissions/:id\` | Delete submission |
| GET | \`/caller/:phoneNumber\` | Get caller history |

**Query Parameters for GET /submissions**:
• \`formId\`: Filter by form
• \`agentId\`: Filter by agent
• \`status\`: Filter by status
• \`callerNumber\`: Search by phone (partial match)
• \`limit\` / \`offset\`: Pagination`,
        },
        {
            question: "What are the database models?",
            answer: `**Sequelize Models** (\`ticketFormModel.js\`):

**TicketForm** (ticket_forms table):
\`\`\`
id: UUID (primary key)
name: STRING (form name)
description: TEXT (optional)
schema: JSON (field definitions)
googleSheetId: STRING (optional, for export)
googleFormUrl: STRING (optional, for sync)
isActive: BOOLEAN (default true)
createdBy: UUID (admin who created)
\`\`\`

**TicketSubmission** (ticket_submissions table):
\`\`\`
id: INTEGER (auto-increment)
formId: UUID (references TicketForm)
agentId: UUID (references Users)
callerNumber: STRING (phone number, nullable)
callId: STRING (for recording lookup, nullable)
responses: JSON (field values)
status: ENUM('draft','submitted','reviewed','closed')
createdAt, updatedAt: DATETIME
\`\`\`

**TicketFormAgent** (ticket_form_agents table):
\`\`\`
id: INTEGER
formId: UUID (references TicketForm)
agentId: UUID (references Users)
assignedAt: DATETIME
\`\`\`

**Field Schema Structure** (within TicketForm.schema):
\`\`\`json
{
  "fields": [
    {
      "id": "uuid",
      "type": "text|dropdown|radio|checkbox|date|number|scale",
      "label": "Field Label",
      "required": true|false,
      "placeholder": "Optional placeholder",
      "options": ["Option1", "Option2"] // for dropdown/radio/checkbox
    }
  ]
}
\`\`\``,
        },
        {
            question: "How do I troubleshoot Google Forms integration?",
            answer: `**Common Issues and Solutions**:

**Issue: "Fetch Fields" button returns error**
• Verify Google Form URL is complete (ends with \`/viewform\`)
• Check form is set to "Anyone with link can respond"
• Verify server has Google API credentials configured

**Issue: Submissions not appearing in Google Forms**
• Check server logs for API errors
• Verify service account has access
• Test with a simple form first

**Issue: Field mapping seems wrong**
• Auto-mapping uses keyword detection
• Rename Google Form field labels to include "phone", "agent", etc.
• Or manually verify mapping before saving

**Issue: Agent can't see form in softphone**
• Verify agent is assigned to the form (Agent Assignment tab)
• Verify form is marked as Active
• Have agent refresh the softphone / re-login

**Issue: Caller number shows "N/A"**
• Caller number only captured during active calls
• If agent submits after call ends, caller number will be null
• This is expected behavior

**Server Logs**: Check PM2 logs for detailed error messages:
\`pm2 logs mayday\``,
        },
    ],
};

// ============================================
// KNOWLEDGE BASE ARTICLES
// ============================================
const knowledgeArticles = [
    {
        title: "Complete Queue Management Guide",
        category: "Queues",
        description: "Everything you need to know about creating and managing voice queues",
        content: `## Creating a Queue

1. Navigate to ** Voice > Voice Queues **
    2. Click ** Add Queue **
        3. Enter queue details:
- Name(no spaces)
    - Strategy
    - Timeout and retry values

## Queue Parameters Explained

    | Parameter | Description | Recommended |
| -----------| -------------| -------------|
| Strategy | How calls are distributed | Round Robin Memory |
| Timeout | Ring time per agent | 15 - 30 seconds |
| Retry | Wait before retrying | 5 seconds |
| Wrapup Time | Post - call delay | 10 - 30 seconds |
| Max Length | Queue capacity | 0(unlimited) |
| Music Class | Hold music | default |

## Agent Penalties

Penalties create call priority tiers:
- ** Penalty 0 **: Primary agents(first to receive calls)
    - ** Penalty 1 **: Secondary agents(when primary busy)
        - ** Penalty 2 +**: Overflow agents(emergency backup)

## Best Practices

1. ** Balance workload **: Use Round Robin or Least Recent strategy
2. ** Set realistic timeouts **: 15 - 30 seconds prevents caller frustration
3. ** Use wrapup time **: Give agents time for post - call work
4. ** Monitor performance **: Check Dashboard for wait times and abandonment`,
    },
    {
        title: "Agent Configuration Reference",
        category: "Agents",
        description: "Complete reference for all agent settings and configuration options",
        content: `## Account Settings

    | Field | Description |
| -------| -------------|
| Username | Login identifier |
| Extension | Phone number(1000 - 9999) |
| Email | Contact email |
| Role | admin, manager, or agent |

## Voice / SIP Settings

    | Setting | Options | Notes |
| ---------| ---------| -------|
| Transport | UDP, TCP, TLS | UDP is default |
| Context | from - internal | For internal routing |
| NAT | yes, no, force_rport | Enable if behind NAT |
| DTMF Mode | rfc4733, inband, info | rfc4733 recommended |

## Codec Priority

Best to worst quality:
1. ** G.722 ** - HD voice(16kHz)
2. ** ULAW ** - Standard(North America)
3. ** ALAW ** - Standard(Europe / International)
4. ** GSM ** - Low bandwidth

## Phonebar Settings

    | Setting | Description |
| ---------| -------------|
| Auto Answer | Answer calls automatically |
| Ringtone | Sound for incoming calls |
| Hotkeys | Keyboard shortcuts |

## Security

    - Passwords must be 8 + characters
        - Include numbers and symbols
            - Change every 90 days(recommended)`,
    },
    {
        title: "SIP Trunk Configuration",
        category: "Trunks",
        description: "How to set up and troubleshoot SIP trunk connections",
        content: `## Required Information

Get from your SIP provider:
- SIP Server / Host address
    - Port(usually 5060 or 5061 for TLS)
    - Username and Password
        - Authentication method
            - Supported codecs

## Basic Configuration

1. ** Name **: Descriptive identifier
2. ** Host **: Provider SIP server
3. ** Username **: Your account ID
4. ** Password **: Account password
5. ** Context **: from - trunk(for inbound)

## Registration

Enable registration if your provider requires it.This sends periodic "heartbeat" messages to keep the connection active.

## Common Issues

    | Problem | Solution |
| ---------| ----------|
| No outbound calls | Check trunk credentials and host |
| No inbound calls | Verify registration and context |
| One - way audio | Check NAT settings and port forwarding |
| Poor quality | Check codecs and network bandwidth |

## Testing

After setup:
1. Check Tools > Trunks for status
2. Make test outbound call
3. Make test inbound call
4. Verify audio both directions`,
    },
    {
        title: "Inbound and Outbound Routing",
        category: "Routes",
        description: "Configure how calls enter and leave your system",
        content: `## Inbound Routes

Direct incoming calls based on:
- ** DID **: The number that was called
    - ** Caller ID **: Who is calling
        - ** Time **: Business hours conditions

### Priority

Lower numbers = higher priority.If multiple routes match, lowest priority wins.

### Destinations

    - Queue
    - Extension
    - IVR
    - Voicemail
    - External Number

## Outbound Routes

Control how outgoing calls are placed.

### Dial Patterns

    | Pattern | Matches | Example |
| ---------| ---------| ---------|
| NXXNXXXXXX | 10 - digit US | 2125551234 |
| 1NXXNXXXXXX | 11 - digit US | 12125551234 |
| 0XXXXXXXXX | Local | 0771234567 |
| 00. | International | 0044... |

### Pattern Syntax

    - X = any digit(0 - 9)
        - N = any digit(2 - 9)
            - Z = any digit(1 - 9)
                - [abc] = a, b, or c
                    - . = one or more of any

## Route Order

Routes are evaluated top to bottom.More specific patterns should be higher priority.`,
    },
    {
        title: "Call Monitoring for Supervisors",
        category: "Management",
        description: "Guide to monitoring, coaching, and managing live calls",
        content: `## Monitoring Modes

### Listen(Silent)
    - You hear both parties
        - No one knows you are listening
            - Best for: Quality assurance, training review

### Whisper
    - You speak to agent only
        - Caller cannot hear you
            - Best for: Real - time coaching, providing info

### Barge
    - You speak to both parties
        - Creates 3 - way call
            - Best for: Escalation, customer intervention

## How to Monitor

1. Go to ** Voice > Call Monitoring **
    2. See list of active calls
3. Click monitor icon on target call
4. Select mode
5. Your phone rings - answer it
6. Hang up when done

## Best Practices

    - Use Listen mode for routine QA
        - Use Whisper sparingly to avoid agent distraction
            - Use Barge only for escalations
                - Document coaching sessions
    - Review recordings for training`,
    },
    {
        title: "Dashboard Metrics Explained",
        category: "Reporting",
        description: "Understanding real-time and historical call center metrics",
        content: `## Real - Time Metrics

    | Metric | Description | Target |
| --------| -------------| --------|
| Waiting Calls | Calls in queue | < 5 |
| Talking Calls | Active conversations | - |
| Available Agents | Ready for calls | > Waiting |
| Abandoned Calls | Caller hung up | < 5 % |
| Avg Wait Time | Queue wait | < 30 sec |

## Service Level

Percentage of calls answered within target time(e.g., 80 % in 20 seconds).

    Formula: (Calls answered in X seconds / Total calls) x 100

## Agent States

    | State | Color | Meaning |
| -------| -------| ---------|
| Available | Green | Ready for calls |
| On Call | Blue | Currently talking |
| Paused | Yellow | Temporarily unavailable |
| Offline | Gray | Logged out |

## Improving Metrics

    ** High Abandonment **:
- Add more agents
    - Reduce wait times
        - Improve announcements

            ** Long Wait Times **:
- Adjust strategies
    - Lower penalties on backups
        - Review agent availability

            ** Low Service Level **:
- Monitor peak hours
    - Schedule appropriately
        - Consider callback options`,
    },
];

// Categories for FAQ navigation
const faqCategories = [
    { key: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { key: "queues", label: "Queues", icon: <QueueIcon /> },
    { key: "agents", label: "Agents", icon: <GroupIcon /> },
    { key: "trunks", label: "Trunks", icon: <PhoneIcon /> },
    { key: "routes", label: "Routes", icon: <RouteIcon /> },
    { key: "recordings", label: "Recordings", icon: <RecordVoiceOverIcon /> },
    { key: "monitoring", label: "Monitoring", icon: <RecordVoiceOverIcon /> },
    { key: "ivr", label: "IVR", icon: <PhoneIcon /> },
    { key: "tickets", label: "Ticket Forms", icon: <ConfirmationNumberIcon /> },
    { key: "integrations", label: "Integrations", icon: <SettingsIcon /> },
    { key: "settings", label: "Settings", icon: <SettingsIcon /> },
];

const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
        {value === index && children}
    </div>
);

const WikiFAQ = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [tabValue, setTabValue] = useState(0);
    const [expandedArticle, setExpandedArticle] = useState(null);

    // Filter FAQs based on search
    const filterFAQs = (faqs) => {
        if (!searchTerm) return faqs;
        return faqs.filter(
            (faq) =>
                faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    // Filter articles based on search
    const filteredArticles = knowledgeArticles.filter(
        (article) =>
            !searchTerm ||
            article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Count total matching FAQs
    const totalFAQs = faqCategories.reduce(
        (sum, cat) => sum + filterFAQs(faqData[cat.key] || []).length,
        0
    );

    return (
        <Box sx={{ p: 3 }}>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 1400, mx: "auto" }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        sx={{
                            color: "primary.main",
                            fontWeight: "bold",
                            fontSize: "2rem",
                            fontFamily: "fantasy",
                            letterSpacing: "0.1em",
                            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                        }}
                        variant="h4"
                        gutterBottom
                    >
                        <HelpOutlineIcon sx={{ fontSize: 40 }} />
                        Mayday Help Center
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Comprehensive documentation for administrators. Find answers, learn
                        configurations, and master Mayday CRM.
                    </Typography>
                </Box>

                {/* Search */}
                <TextField
                    fullWidth
                    placeholder="Search FAQs and knowledge base..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 3 }}
                />

                {searchTerm && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Found {totalFAQs} FAQs and {filteredArticles.length} articles
                        matching &quot;{searchTerm}&quot;
                    </Typography>
                )}

                {/* Tabs */}
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
                >
                    <Tab
                        label={`FAQs(${totalFAQs})`}
                        icon={<HelpOutlineIcon />}
                        iconPosition="start"
                    />
                    <Tab
                        label={`Guides(${filteredArticles.length})`}
                        icon={<ArticleIcon />}
                        iconPosition="start"
                    />
                </Tabs>

                {/* FAQs Tab */}
                <TabPanel value={tabValue} index={0}>
                    {/* Category Navigation */}
                    <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
                        {faqCategories.map((cat) => {
                            const count = filterFAQs(faqData[cat.key] || []).length;
                            if (searchTerm && count === 0) return null;
                            return (
                                <Chip
                                    key={cat.key}
                                    icon={cat.icon}
                                    label={`${cat.label} (${count})`}
                                    onClick={() => {
                                        document
                                            .getElementById(`category - ${cat.key} `)
                                            ?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    sx={{ cursor: "pointer" }}
                                    variant="outlined"
                                />
                            );
                        })}
                    </Box>

                    {/* FAQ Sections */}
                    {faqCategories.map((cat) => {
                        const faqs = filterFAQs(faqData[cat.key] || []);
                        if (faqs.length === 0) return null;

                        return (
                            <Box key={cat.key} id={`category - ${cat.key} `} sx={{ mb: 4 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        mb: 2,
                                        color: "primary.main",
                                    }}
                                >
                                    {cat.icon}
                                    {cat.label}
                                </Typography>

                                {faqs.map((faq, index) => (
                                    <Accordion
                                        key={index}
                                        sx={{
                                            border: faq.highlight ? "2px solid" : "1px solid",
                                            borderColor: faq.highlight ? "primary.main" : "divider",
                                            mb: 1,
                                            "&:before": { display: "none" },
                                        }}
                                    >
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography fontWeight={faq.highlight ? 600 : 400}>
                                                {faq.question}
                                                {faq.highlight && (
                                                    <Chip
                                                        label="Important"
                                                        size="small"
                                                        color="primary"
                                                        sx={{ ml: 1 }}
                                                    />
                                                )}
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography
                                                component="div"
                                                sx={{
                                                    whiteSpace: "pre-wrap",
                                                    lineHeight: 1.8,
                                                    "& strong": { fontWeight: 600, color: "primary.main" },
                                                }}
                                            >
                                                {faq.answer}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </Box>
                        );
                    })}
                </TabPanel>

                {/* Knowledge Base Tab */}
                <TabPanel value={tabValue} index={1}>
                    {filteredArticles.length === 0 ? (
                        <Typography
                            color="text.secondary"
                            sx={{ textAlign: "center", py: 4 }}
                        >
                            No articles found matching your search.
                        </Typography>
                    ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {filteredArticles.map((article, index) => (
                                <Card
                                    key={index}
                                    variant="outlined"
                                    sx={{
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        "&:hover": { boxShadow: 2 },
                                    }}
                                    onClick={() =>
                                        setExpandedArticle(expandedArticle === index ? null : index)
                                    }
                                >
                                    <CardContent>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            <Box>
                                                <Chip
                                                    label={article.category}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ mb: 1 }}
                                                />
                                                <Typography variant="h6">{article.title}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {article.description}
                                                </Typography>
                                            </Box>
                                            <ExpandMoreIcon
                                                sx={{
                                                    transform:
                                                        expandedArticle === index
                                                            ? "rotate(180deg)"
                                                            : "none",
                                                    transition: "transform 0.2s",
                                                }}
                                            />
                                        </Box>

                                        {expandedArticle === index && (
                                            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid #eee" }}>
                                                <Typography
                                                    component="div"
                                                    sx={{
                                                        whiteSpace: "pre-wrap",
                                                        lineHeight: 1.8,
                                                        "& h2, & h3": {
                                                            color: "primary.main",
                                                            fontWeight: 600,
                                                            mt: 2,
                                                            mb: 1,
                                                        },
                                                        "& strong": { fontWeight: 600 },
                                                        "& code": {
                                                            bgcolor: "grey.100",
                                                            px: 0.5,
                                                            borderRadius: 1,
                                                        },
                                                    }}
                                                >
                                                    {article.content}
                                                </Typography>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}
                </TabPanel>

                {/* Footer */}
                <Divider sx={{ mt: 4, mb: 2 }} />
                <Typography variant="body2" color="text.secondary" align="center">
                    Need more help? Contact your system administrator or check the full
                    documentation.
                </Typography>
            </Paper>
        </Box>
    );
};

export default WikiFAQ;
