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

// FAQ Data organized by category
const faqData = {
    queues: [
        {
            question: "What are Voice Queues?",
            answer:
                "Voice Queues are holding areas for incoming calls that are answered by a group of agents. When a call comes in, it's placed in the queue and distributed to available agents based on the configured strategy.",
        },
        {
            question: "What is an Agent Penalty and how does it work?",
            answer:
                "Agent Penalty determines the priority order for call distribution. Agents with lower penalties (0 = highest priority) receive calls first. Higher penalty agents only receive calls when lower penalty agents are busy. This is useful for tiered support - e.g., junior agents (penalty 0) get calls first, senior agents (penalty 1+) act as backup.",
            highlight: true,
        },
        {
            question: "What queue strategies are available?",
            answer: `
• **Ring All**: Rings all available agents simultaneously
• **Round Robin Memory**: Remembers the last agent who answered and starts from the next agent
• **Least Recent**: Rings the agent who has been idle the longest
• **Fewest Calls**: Rings the agent who has taken the fewest calls
• **Random**: Randomly selects an available agent
• **Ring In Order**: Rings agents in the order they were added to the queue
      `.trim(),
        },
        {
            question: "How do I add agents to a queue?",
            answer:
                'Navigate to Voice → Voice Queues, click on a queue, then click the "Add Agent" button. Select agents from the available list, set their individual penalties, and click "Commit Changes".',
        },
        {
            question: "What does the Timeout setting do?",
            answer:
                "Timeout specifies how many seconds a call will ring each agent before moving to the next. If set to 15 seconds, each agent's phone will ring for 15 seconds before the system tries the next agent or action.",
        },
        {
            question: "What is Wrapup Time?",
            answer:
                "Wrapup Time is the delay (in seconds) after an agent completes a call before they can receive another call. This gives agents time to complete post-call tasks like notes or follow-ups.",
        },
    ],
    agents: [
        {
            question: "How do I create a new agent?",
            answer:
                'Go to Staff → Agents, click "Add Agent", fill in the required details (name, extension, password), and save. The agent will automatically be assigned an extension and can log in to the system.',
        },
        {
            question: "What's the difference between an Agent and an Extension?",
            answer:
                "An Extension is a phone number identifier (e.g., 1001). An Agent is a user account that can log in, be assigned to queues, and take calls. Each agent is assigned an extension to receive calls.",
        },
        {
            question: "How do I pause/unpause an agent?",
            answer:
                "Agents can be paused from the Voice → Realtime view. When paused, an agent remains logged in but won't receive queue calls. This is useful for breaks or meetings.",
        },
    ],
    calls: [
        {
            question: "What is Call Monitoring (ChanSpy)?",
            answer:
                "Call Monitoring allows supervisors to listen to live calls in three modes: Listen (silent monitoring), Whisper (speak to agent only), and Barge (speak to both parties). Access it from Voice → Call Monitoring.",
        },
        {
            question: "How do call transfers work?",
            answer:
                "Mayday supports two transfer types: Blind Transfer (immediately transfers without consultation) and Attended/Managed Transfer (allows consultation with the target before completing the transfer).",
        },
        {
            question: "Where can I find call recordings?",
            answer:
                "Call recordings are available in Voice → Recordings. You can filter by date, queue, or agent. Recordings can be played directly in the browser or downloaded.",
        },
    ],
    settings: [
        {
            question: "How do I configure Inbound Routes?",
            answer:
                "Inbound Routes determine how incoming calls are handled. Go to Voice → Inbound Routes to create rules based on caller ID patterns, time conditions, or DID numbers. Each route can direct calls to queues, IVRs, or specific extensions.",
        },
        {
            question: "What are Trunks?",
            answer:
                "Trunks are connections to external phone networks (PSTN or VoIP providers). They handle outgoing and incoming calls from/to external phone numbers. Configure them in Tools → Trunks.",
        },
        {
            question: "How do I set up Music On Hold?",
            answer:
                "Music On Hold plays audio while callers wait in queue. Go to Voice → Music On Hold to upload audio files. Supported formats include WAV and MP3.",
        },
    ],
};

// Knowledge Base Articles
const knowledgeArticles = [
    {
        title: "Getting Started with Queue Management",
        category: "Queues",
        description:
            "Learn how to create and configure voice queues for your call center.",
        content: `
## Creating Your First Queue

1. Navigate to **Voice → Voice Queues**
2. Click **Add Queue**
3. Enter a name and select a strategy
4. Set timeout and wrapup time values
5. Save the queue

## Adding Agents

After creating a queue, add agents:
1. Open the queue settings
2. Click **Add Agent**
3. Select agents and set their penalties
4. Click **Commit Changes**

## Best Practices

- Use **penalties** to create tiered support (0 = primary, 1+ = backup)
- Set appropriate **timeout** values (15-30 seconds is typical)
- Use **wrapup time** to allow agents to complete post-call work
    `.trim(),
    },
    {
        title: "Understanding Agent Penalties",
        category: "Queues",
        description:
            "How to use penalties to prioritize call distribution among agents.",
        content: `
## What is a Penalty?

A penalty is a priority value assigned to each agent in a queue:

| Penalty | Priority | Behavior |
|---------|----------|----------|
| 0 | Highest | Called first |
| 1 | Medium | Called when 0 is busy |
| 2+ | Lower | Called as backup |

## Use Cases

### Tiered Support
- **Penalty 0**: Junior agents handle most calls
- **Penalty 1**: Senior agents as backup
- **Penalty 2**: Supervisors as last resort

### Overflow Scenarios
- **Penalty 0**: Primary team
- **Penalty 1**: Other department agents during peak hours

## Setting Penalties

1. Open queue settings
2. Click "Add Agent"
3. Each agent has an individual penalty input field
4. Set desired values and commit changes
    `.trim(),
    },
    {
        title: "Call Monitoring Guide",
        category: "Supervision",
        description:
            "How supervisors can monitor, coach, and assist agents during live calls.",
        content: `
## Monitoring Modes

### Listen Mode (Silent)
- Hear both caller and agent
- Neither party knows you're listening
- Use for: Quality assurance, training review

### Whisper Mode
- Speak to agent only
- Caller cannot hear you
- Use for: Real-time coaching, providing information

### Barge Mode
- Speak to both parties
- 3-way conversation
- Use for: Escalation, intervention, customer service

## How to Monitor

1. Go to **Voice → Call Monitoring**
2. View list of active calls
3. Select a call and choose monitoring mode
4. Your phone will ring - answer to start monitoring
    `.trim(),
    },
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

    const categories = [
        { key: "queues", label: "Queues", icon: <QueueIcon /> },
        { key: "agents", label: "Agents", icon: <GroupIcon /> },
        { key: "calls", label: "Calls", icon: <PhoneIcon /> },
        { key: "settings", label: "Settings", icon: <SettingsIcon /> },
    ];

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

    return (
        <Box sx={{ p: 3 }}>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 1200, mx: "auto" }}>
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
                        Help Center
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Find answers to frequently asked questions and learn how to use
                        Mayday CRM effectively.
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

                {/* Tabs */}
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
                >
                    <Tab label="FAQs" icon={<HelpOutlineIcon />} iconPosition="start" />
                    <Tab
                        label="Knowledge Base"
                        icon={<ArticleIcon />}
                        iconPosition="start"
                    />
                </Tabs>

                {/* FAQs Tab */}
                <TabPanel value={tabValue} index={0}>
                    {/* Category Navigation */}
                    <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
                        {categories.map((cat) => (
                            <Chip
                                key={cat.key}
                                icon={cat.icon}
                                label={`${cat.label} (${filterFAQs(faqData[cat.key]).length})`}
                                onClick={() => {
                                    document
                                        .getElementById(`category-${cat.key}`)
                                        ?.scrollIntoView({ behavior: "smooth" });
                                }}
                                sx={{ cursor: "pointer" }}
                            />
                        ))}
                    </Box>

                    {/* FAQ Sections */}
                    {categories.map((cat) => {
                        const faqs = filterFAQs(faqData[cat.key]);
                        if (faqs.length === 0) return null;

                        return (
                            <Box key={cat.key} id={`category-${cat.key}`} sx={{ mb: 4 }}>
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
                                            border: faq.highlight
                                                ? "2px solid"
                                                : "1px solid",
                                            borderColor: faq.highlight
                                                ? "primary.main"
                                                : "divider",
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
                                                    "& strong": { fontWeight: 600 },
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
                        <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
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
                                        setExpandedArticle(
                                            expandedArticle === index ? null : index
                                        )
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
                                                        "& h2": { fontSize: "1.2rem", fontWeight: 600, mt: 2, mb: 1 },
                                                        "& h3": { fontSize: "1.1rem", fontWeight: 600, mt: 2, mb: 1 },
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
                    Cannot find what you are looking for? Contact your system administrator
                    for assistance.
                </Typography>
            </Paper>
        </Box>
    );
};

export default WikiFAQ;
