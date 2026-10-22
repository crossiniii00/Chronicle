import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateHTML() {
    console.log('Generating ChronicleV7 Executive Professional HTML User Manual...');

    const artifactDir = path.join('C:', 'Users', 'cp360admin', '.gemini', 'antigravity-ide', 'brain', 'b40bf7b6-26f7-462b-b399-bfe8ec6d58df');
    
    // Read embedded screenshots as base64
    const getImageBase64 = (filename) => {
        try {
            const filepath = path.join(artifactDir, '.user_uploaded', filename);
            if (fs.existsSync(filepath)) {
                const buffer = fs.readFileSync(filepath);
                return `data:image/png;base64,${buffer.toString('base64')}`;
            }
        } catch (e) {
            console.error(`Failed to read ${filename}:`, e);
        }
        return '';
    };

    const imgSidebar = getImageBase64('media_1788671258087.png');
    const imgRoomEdit = getImageBase64('media_1788665432757.png');
    const imgRecruiterSelect = getImageBase64('media_1788666627439.png');
    const imgDashboardAnalytics = getImageBase64('media_1788665190839.png');
    const imgApplicantList = getImageBase64('media_1788664105778.png');
    const imgInterviewRoomsGrid = getImageBase64('media_1788670926166.png');
    const imgInterviewForm = getImageBase64('media_1788664773287.png');
    const imgSchedulingMasterlist = getImageBase64('media_1788664958435.png');
    const imgAccountRegistry = getImageBase64('media_1788683450773.png');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChronicleV7 Enterprise Operational Manual | ContactPoint 360</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #0F172A;
            --primary-light: #1E293B;
            --accent: #2563EB;
            --accent-hover: #1D4ED8;
            --brand-red: #E11D48;
            --surface: #F8FAFC;
            --card-bg: #FFFFFF;
            --text-dark: #0F172A;
            --text-muted: #64748B;
            --border: #E2E8F0;
            --sidebar-width: 300px;
        }

        @media print {
            .no-print, .sidebar, .top-actions { display: none !important; }
            body { background: #fff !important; padding: 0 !important; font-size: 10pt !important; }
            .main-content { margin-left: 0 !important; padding: 0 !important; max-width: 100% !important; }
            .section-card { box-shadow: none !important; border: 1px solid #cbd5e1 !important; page-break-inside: avoid; }
            .browser-frame { border: 1px solid #94a3b8 !important; }
            .page-break { page-break-after: always; }
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        html { scroll-behavior: smooth; }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--text-dark);
            background-color: var(--surface);
            line-height: 1.6;
            font-size: 14px;
            display: flex;
            min-height: 100vh;
        }

        /* SIDEBAR NAVIGATION */
        .sidebar {
            width: var(--sidebar-width);
            background-color: var(--primary);
            color: #F8FAFC;
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            overflow-y: auto;
            z-index: 100;
            display: flex;
            flex-direction: column;
            border-right: 1px solid rgba(255,255,255,0.1);
        }

        .sidebar-header {
            padding: 24px;
            background: #090D16;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .brand-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .brand-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #E11D48 0%, #2563EB 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            color: #fff;
            font-size: 18px;
            box-shadow: 0 4px 12px rgba(225,29,72,0.3);
        }

        .brand-title {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-weight: 800;
            font-size: 17px;
            color: #FFFFFF;
            letter-spacing: -0.3px;
        }

        .brand-subtitle {
            font-size: 11px;
            color: #94A3B8;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .sidebar-search {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .search-input-wrapper {
            position: relative;
        }

        .search-input {
            width: 100%;
            padding: 10px 14px 10px 36px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 8px;
            color: #fff;
            font-size: 12.5px;
            outline: none;
            transition: all 0.2s ease;
        }

        .search-input:focus {
            background: rgba(255,255,255,0.12);
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(37,99,235,0.25);
        }

        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #94A3B8;
            font-size: 13px;
        }

        .nav-menu {
            padding: 16px 12px;
            flex-grow: 1;
        }

        .nav-group {
            margin-bottom: 20px;
        }

        .nav-group-label {
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #64748B;
            padding: 6px 12px;
        }

        .nav-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            color: #CBD5E1;
            text-decoration: none;
            font-size: 12.5px;
            font-weight: 500;
            border-radius: 6px;
            margin-top: 2px;
            transition: all 0.15s ease;
        }

        .nav-item:hover {
            background: rgba(255,255,255,0.08);
            color: #FFFFFF;
            padding-left: 16px;
        }

        .nav-item.active {
            background: var(--accent);
            color: #FFFFFF;
            font-weight: 600;
        }

        .nav-item .badge {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(255,255,255,0.15);
        }

        .sidebar-footer {
            padding: 16px 20px;
            background: #090D16;
            border-top: 1px solid rgba(255,255,255,0.08);
            font-size: 11px;
            color: #64748B;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        /* MAIN CONTENT AREA */
        .main-content {
            margin-left: var(--sidebar-width);
            flex-grow: 1;
            padding: 40px 60px;
            max-width: 1240px;
        }

        /* TOP ACTION BAR */
        .top-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            background: #FFFFFF;
            padding: 16px 28px;
            border-radius: 12px;
            border: 1px solid var(--border);
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .breadcrumb {
            font-size: 12.5px;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .breadcrumb span { font-weight: 600; color: var(--text-dark); }

        .btn-group { display: flex; gap: 10px; }

        .btn {
            padding: 9px 18px;
            border-radius: 8px;
            font-size: 12.5px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .btn-primary {
            background-color: var(--accent);
            color: #FFFFFF;
            box-shadow: 0 2px 6px rgba(37,99,235,0.25);
        }

        .btn-primary:hover { background-color: var(--accent-hover); transform: translateY(-1px); }

        .btn-secondary {
            background-color: #F1F5F9;
            color: var(--text-dark);
            border: 1px solid var(--border);
        }

        .btn-secondary:hover { background-color: #E2E8F0; }

        /* COVER / DOCUMENT CONTROL HEADER */
        .doc-header {
            background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
            color: #FFFFFF;
            padding: 48px;
            border-radius: 16px;
            margin-bottom: 40px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(15,23,42,0.15);
        }

        .doc-header::after {
            content: '';
            position: absolute;
            top: -50px;
            right: -50px;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(37,99,235,0.25) 0%, rgba(0,0,0,0) 70%);
            pointer-events: none;
        }

        .doc-title-badge {
            display: inline-block;
            padding: 4px 12px;
            background: rgba(37,99,235,0.3);
            border: 1px solid rgba(37,99,235,0.5);
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #60A5FA;
            margin-bottom: 16px;
        }

        .doc-title {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 32px;
            font-weight: 800;
            line-height: 1.25;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
        }

        .doc-subtitle {
            font-size: 15px;
            color: #94A3B8;
            max-width: 760px;
            margin-bottom: 28px;
        }

        .doc-meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            padding-top: 24px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }

        .meta-item { font-size: 12px; }
        .meta-label { color: #64748B; text-transform: uppercase; font-weight: 700; font-size: 10px; letter-spacing: 0.5px; }
        .meta-value { color: #F8FAFC; font-weight: 600; margin-top: 2px; }

        /* SECTION CARDS */
        .section-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 36px;
            margin-bottom: 32px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #F1F5F9;
        }

        .section-number {
            width: 40px;
            height: 40px;
            background: #EFF6FF;
            color: var(--accent);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-weight: 800;
            font-size: 18px;
            border: 1px solid #BFDBFE;
        }

        .section-title-text {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 22px;
            font-weight: 800;
            color: var(--text-dark);
            letter-spacing: -0.3px;
        }

        .subsection-title {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 16px;
            font-weight: 700;
            color: #1E293B;
            margin: 28px 0 14px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .subsection-title code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            background: #F1F5F9;
            color: #0F172A;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid #CBD5E1;
            font-weight: 500;
        }

        /* BROWSER MOCKUP FRAME */
        .browser-frame {
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #CBD5E1;
            background: #FFFFFF;
            margin: 24px 0;
            box-shadow: 0 12px 24px -6px rgba(15,23,42,0.08);
        }

        .browser-header {
            background: #F1F5F9;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid #E2E8F0;
        }

        .browser-dots {
            display: flex;
            gap: 6px;
        }

        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .dot-red { background: #EF4444; }
        .dot-yellow { background: #F59E0B; }
        .dot-green { background: #10B981; }

        .browser-url {
            flex-grow: 1;
            background: #FFFFFF;
            padding: 4px 14px;
            border-radius: 6px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            color: #64748B;
            border: 1px solid #E2E8F0;
        }

        .browser-content img {
            width: 100%;
            height: auto;
            display: block;
            cursor: zoom-in;
            transition: transform 0.2s ease;
        }

        .browser-content img:hover {
            opacity: 0.98;
        }

        .screenshot-caption {
            padding: 10px 16px;
            background: #F8FAFC;
            font-size: 12px;
            color: var(--text-muted);
            border-top: 1px solid #E2E8F0;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* STEP PROCEDURE BOX */
        .step-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 18px 0;
        }

        .step-item {
            display: flex;
            gap: 16px;
            background: #F8FAFC;
            padding: 16px 20px;
            border-radius: 10px;
            border: 1px solid #E2E8F0;
            align-items: flex-start;
        }

        .step-badge {
            width: 28px;
            height: 28px;
            background: var(--primary);
            color: #FFFFFF;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 12px;
            flex-shrink: 0;
        }

        .step-content { flex-grow: 1; }
        .step-title { font-weight: 700; font-size: 13.5px; color: var(--text-dark); margin-bottom: 2px; }
        .step-desc { font-size: 12.5px; color: var(--text-muted); }

        /* CALLOUT BOXES */
        .callout {
            padding: 18px 22px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid;
            font-size: 13px;
        }

        .callout-zoom {
            background: #EFF6FF;
            border-color: var(--accent);
            color: #1E3A8A;
        }

        .callout-zoom .callout-title {
            font-weight: 800;
            color: #1E40AF;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .callout-important {
            background: #FFF1F2;
            border-color: var(--brand-red);
            color: #881337;
        }

        .callout-important .callout-title {
            font-weight: 800;
            color: #9F1239;
            margin-bottom: 6px;
        }

        .zoom-badge {
            background: var(--accent);
            color: #fff;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 800;
        }

        /* TABLES */
        .custom-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12.5px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--border);
        }

        .custom-table th {
            background: #F1F5F9;
            color: #334155;
            font-weight: 700;
            text-align: left;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border);
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }

        .custom-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #F1F5F9;
            color: #334155;
        }

        .custom-table tr:last-child td { border-bottom: none; }
        .custom-table tr:nth-child(even) { background: #FAFAFA; }

        /* ROLE BADGES */
        .role-pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .role-admin { background: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE; }
        .role-recruiter { background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; }
        .role-ops { background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }

        /* LIGHTBOX MODAL */
        .lightbox {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15,23,42,0.9);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            padding: 40px;
        }

        .lightbox img {
            max-width: 90%;
            max-height: 90%;
            border-radius: 12px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            border: 2px solid rgba(255,255,255,0.2);
        }

        .lightbox-close {
            position: absolute;
            top: 20px;
            right: 30px;
            color: #fff;
            font-size: 32px;
            font-weight: 300;
            cursor: pointer;
        }
    </style>
</head>
<body>

    <!-- SIDEBAR NAVIGATION -->
    <aside class="sidebar no-print">
        <div class="sidebar-header">
            <div class="brand-logo">
                <div class="brand-icon">C7</div>
                <div>
                    <div class="brand-title">ChronicleV7</div>
                    <div class="brand-subtitle">ContactPoint 360</div>
                </div>
            </div>
        </div>

        <div class="sidebar-search">
            <div class="search-input-wrapper">
                <span class="search-icon">🔍</span>
                <input type="text" id="manualSearch" class="search-input" placeholder="Search 27 tabs, features..." onkeyup="filterSections()" />
            </div>
        </div>

        <nav class="nav-menu">
            <div class="nav-group">
                <div class="nav-group-label">Document Overview</div>
                <a href="#doc-overview" class="nav-item active">
                    <span>Document Control</span>
                    <span class="badge">v7.4.2</span>
                </a>
                <a href="#auth-module" class="nav-item">
                    <span>00. Authentication</span>
                    <span class="badge">Auth</span>
                </a>
            </div>

            <div class="nav-group">
                <div class="nav-group-label">Quick Access</div>
                <a href="#quick-settings" class="nav-item">
                    <span>01. Quick Settings</span>
                </a>
            </div>

            <div class="nav-group">
                <div class="nav-group-label">Main Module</div>
                <a href="#dashboard" class="nav-item"><span>02.1 Dashboard</span></a>
                <a href="#forums" class="nav-item"><span>02.2 Forums</span></a>
                <a href="#calendar" class="nav-item"><span>02.3 Calendar</span></a>
                <a href="#my-tasks" class="nav-item"><span>02.4 My Tasks</span></a>
                <a href="#profile" class="nav-item"><span>02.5 Profile</span></a>
            </div>

            <div class="nav-group">
                <div class="nav-group-label">Recruitment</div>
                <a href="#applicant-management" class="nav-item"><span>03.1 Application Mgmt</span></a>
                <a href="#interview-form" class="nav-item"><span>03.2 Interview Form</span></a>
                <a href="#masterlist" class="nav-item"><span>03.3 Masterlist</span></a>
                <a href="#ops-val-scheduling" class="nav-item"><span>03.4 Ops Val Scheduling</span></a>
                <a href="#interview-rooms" class="nav-item"><span>04.1 Interview Rooms</span></a>
                <a href="#queue-console" class="nav-item"><span>04.2 Queue Console</span></a>
                <a href="#job-postings" class="nav-item"><span>05.1 Job Postings</span></a>
                <a href="#accounts-support" class="nav-item"><span>05.2 Accounts & Support</span></a>
            </div>

            <div class="nav-group">
                <div class="nav-group-label">Insights</div>
                <a href="#report-dashboard" class="nav-item"><span>06.1 Report Dashboard</span></a>
                <a href="#tests-tracker" class="nav-item"><span>06.2 Tests Tracker</span></a>
                <a href="#employee-tracker" class="nav-item"><span>06.3 Employee Tracker</span></a>
                <a href="#security-logs" class="nav-item"><span>06.4 Security Logs</span></a>
            </div>

            <div class="nav-group">
                <div class="nav-group-label">System & References</div>
                <a href="#mhrt-module" class="nav-item"><span>07. MHRT (6 Tabs)</span></a>
                <a href="#crm-settings" class="nav-item"><span>08. CRM Setup (7 Tabs)</span></a>
            </div>
        </nav>

        <div class="sidebar-footer">
            <span>ContactPoint 360 Enterprise</span>
            <span>2026</span>
        </div>
    </aside>

    <!-- MAIN CONTENT VIEWPORT -->
    <main class="main-content">

        <!-- TOP ACTIONS BAR -->
        <div class="top-actions no-print">
            <div class="breadcrumb">
                <span>Documentation</span> / <span>ChronicleV7</span> / <span>Master Operational Manual</span>
            </div>
            <div class="btn-group">
                <button class="btn btn-primary" onclick="window.print()">
                    <span>🖨️ Export PDF / Print Manual</span>
                </button>
            </div>
        </div>

        <!-- COVER / DOCUMENT CONTROL HEADER -->
        <header id="doc-overview" class="doc-header">
            <div class="doc-title-badge">ENTERPRISE SYSTEM OPERATIONAL MANUAL</div>
            <h1 class="doc-title">ChronicleV7 Recruitment & CRM Management Platform</h1>
            <p class="doc-subtitle">Comprehensive 100% Feature Execution Guide spanning 27 operational menu tabs, role-based workflows, interviewer assignment engines, and administrative setup.</p>

            <div class="doc-meta-grid">
                <div class="meta-item">
                    <div class="meta-label">System Release</div>
                    <div class="meta-value">Chronicle V7.4.2 Enterprise</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Target Audience</div>
                    <div class="meta-value">Recruiters, Ops Validators, Admins</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Security Scope</div>
                    <div class="meta-value">Internal Operational Standard</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Total Modules Covered</div>
                    <div class="meta-value">27 Tabs across 8 Categories</div>
                </div>
            </div>
        </header>

        <!-- SECTION 00: AUTHENTICATION -->
        <section id="auth-module" class="section-card searchable-section">
            <div class="section-header">
                <div class="section-number">00</div>
                <div class="section-title-text">User Authentication & Access Control</div>
            </div>

            <p>Access to ChronicleV7 is strictly protected by role-based route guards and single sign-on (SSO) or local credentials.</p>

            <div class="step-container">
                <div class="step-item">
                    <div class="step-badge">1</div>
                    <div class="step-content">
                        <div class="step-title">Navigate to Login Gateway</div>
                        <div class="step-desc">Open <code>https://chroniclev7.contactpoint360.com/login</code>. Enter your corporate email and secure password.</div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-badge">2</div>
                    <div class="step-content">
                        <div class="step-title">Role-Based Dashboard Dispatch</div>
                        <div class="step-desc">Upon successful authentication, the route guard dispatches <span class="role-pill role-admin">Admin</span> users to <code>/admin/dashboard</code>, <span class="role-pill role-recruiter">Recruiters</span> to <code>/recruiter/dashboard</code>, and <span class="role-pill role-ops">Ops Validators</span> to account specific views.</div>
                    </div>
                </div>
            </div>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Role Identifier</th>
                        <th>Default Landing Page</th>
                        <th>Operational Permissions & Scope</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><span class="role-pill role-admin">Administrator</span></td>
                        <td><code>/admin/dashboard</code></td>
                        <td>Full read/write access to system settings, user management, backups, and security audit logs.</td>
                    </tr>
                    <tr>
                        <td><span class="role-pill role-recruiter">Recruiter</span></td>
                        <td><code>/recruiter/dashboard</code></td>
                        <td>Manage candidate applications, conduct initial interviews, assign tokens, schedule Ops Val slots.</td>
                    </tr>
                    <tr>
                        <td><span class="role-pill role-ops">Ops Validator</span></td>
                        <td><code>/recruiter/interview-rooms</code></td>
                        <td>Assigned to specific client target accounts; conducts final validator interviews and logs pass/fail decisions.</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <!-- SECTION 01: QUICK ACCESS -->
        <section id="quick-settings" class="section-card searchable-section">
            <div class="section-header">
                <div class="section-number">01</div>
                <div class="section-title-text">Quick Access — Quick Settings</div>
            </div>
            <p><strong>Route / Trigger:</strong> <code>/admin/settings/quick</code> or <strong>Quick Settings</strong> Sidebar Button.</p>

            <div class="step-container">
                <div class="step-item">
                    <div class="step-badge">1</div>
                    <div class="step-content">
                        <div class="step-title">Theme Personalization</div>
                        <div class="step-desc">Toggle UI color palettes between Microsoft Blue, Indigo, Emerald, Purple, and High-Contrast Dark modes.</div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-badge">2</div>
                    <div class="step-content">
                        <div class="step-title">Audio Chime & Queue Sound Controls</div>
                        <div class="step-desc">Adjust token call audio chime volume and voice synthesizer pitch for Queue Display announcements.</div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-badge">3</div>
                    <div class="step-content">
                        <div class="step-title">Auto-Refresh Interval Polling</div>
                        <div class="step-desc">Set background synchronization rate for live candidate queue cards (30s, 60s, 5m).</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- SECTION 02: MAIN MODULE -->
        <section id="main-module" class="section-card searchable-section">
            <div class="section-header">
                <div class="section-number">02</div>
                <div class="section-title-text">Main Module</div>
            </div>

            <div id="dashboard">
                <h3 class="subsection-title">2.1 Dashboard (<code>/recruiter/dashboard</code> & <code>/admin/dashboard</code>)</h3>
                <p>Real-time operational dashboard providing high-level recruitment metrics, active queue counts, and recent activity streams.</p>

                ${imgDashboardAnalytics ? `
                <div class="browser-frame">
                    <div class="browser-header">
                        <div class="browser-dots">
                            <div class="dot dot-red"></div>
                            <div class="dot dot-yellow"></div>
                            <div class="dot dot-green"></div>
                        </div>
                        <div class="browser-url">https://chroniclev7.contactpoint360.com/recruiter/dashboard</div>
                    </div>
                    <div class="browser-content">
                        <img src="${imgDashboardAnalytics}" alt="Dashboard Analytics" onclick="openLightbox(this.src)" />
                    </div>
                    <div class="screenshot-caption">Figure 2.1: Executive Account Analytics Dashboard showing real-time applicant quotas and pass rates.</div>
                </div>
                ` : ''}
            </div>

            <div id="forums">
                <h3 class="subsection-title">2.2 Forums (<code>/forums</code>)</h3>
                <p>Internal communication portal for recruiters and Operations Validators to exchange candidate feedback notes, account updates, and hiring policy announcements.</p>
            </div>

            <div id="calendar">
                <h3 class="subsection-title">2.3 Calendar (<code>/calendar</code>)</h3>
                <p>Interactive schedule view for candidate interview bookings, validator availability slots, and room occupancy schedules.</p>
            </div>

            <div id="my-tasks">
                <h3 class="subsection-title">2.4 My Tasks (<code>/my-tasks</code>)</h3>
                <p>Personal task list for recruiters detailing assigned applicants awaiting evaluation, pending call-backs, and deadline alerts.</p>
            </div>

            <div id="profile">
                <h3 class="subsection-title">2.5 Profile (<code>/profile</code>)</h3>
                <p>User profile management page to update full name, email, avatar image, security password, and view assigned target accounts.</p>
            </div>
        </section>

        <!-- SECTION 03: RECRUITMENT - APPLICANT TRACKER -->
        <section id="applicant-tracker" class="section-card searchable-section">
            <div class="section-header">
                <div class="section-number">03</div>
                <div class="section-title-text">Recruitment — Applicant Tracker</div>
            </div>

            <div id="applicant-management">
                <h3 class="subsection-title">3.1 Application Management (<code>/recruiter/applicant-management</code>)</h3>
                <p>Central intake workspace featuring high-density candidate tables, multi-column search, and granular filters.</p>

                ${imgApplicantList ? `
                <div class="browser-frame">
                    <div class="browser-header">
                        <div class="browser-dots">
                            <div class="dot dot-red"></div>
                            <div class="dot dot-yellow"></div>
                            <div class="dot dot-green"></div>
                        </div>
                        <div class="browser-url">https://chroniclev7.contactpoint360.com/recruiter/applicant-management</div>
                    </div>
                    <div class="browser-content">
                        <img src="${imgApplicantList}" alt="Applicant Management Masterlist" onclick="openLightbox(this.src)" />
                    </div>
                    <div class="screenshot-caption">Figure 3.1: High-Density Candidate Intake Masterlist with Target Account & Ops Validator Filters.</div>
                </div>
                ` : ''}

                <div class="callout callout-zoom">
                    <div class="callout-title"><span class="zoom-badge">FEATURE ZOOM</span> Granular Filtering Toolbar</div>
                    1. <strong>Target Account Filter:</strong> Narrows down candidate view by specific client account (e.g., <em>DoorDash, Enercare, Keller Postman</em>).<br>
                    2. <strong>Ops Validator Filter:</strong> Filters applicants assigned to specific Operations Validators.<br>
                    3. <strong>Stage Status Pills:</strong> Quickly toggle between <em>Applied, Typing Test, Initial Interview, Assessment, Final Interview, Hired, Failed</em>.
                </div>
            </div>

            <div id="interview-form">
                <h3 class="subsection-title">3.2 Interview Form (<code>/recruiter/tracker/interview-form</code>)</h3>
                <p>Full-screen candidate evaluation interface used during live interviews to record scoring metrics, question notes, and final recommendations.</p>

                ${imgInterviewForm ? `
                <div class="browser-frame">
                    <div class="browser-header">
                        <div class="browser-dots">
                            <div class="dot dot-red"></div>
                            <div class="dot dot-yellow"></div>
                            <div class="dot dot-green"></div>
                        </div>
                        <div class="browser-url">https://chroniclev7.contactpoint360.com/recruiter/tracker/interview-form</div>
                    </div>
                    <div class="browser-content">
                        <img src="${imgInterviewForm}" alt="Interview Form View" onclick="openLightbox(this.src)" />
                    </div>
                    <div class="screenshot-caption">Figure 3.2: Standalone Candidate Interview Scoring & Competency Form.</div>
                </div>
                ` : ''}
            </div>

            <div id="masterlist">
                <h3 class="subsection-title">3.3 Masterlist (<code>/recruiter/tracker/masterlist</code>)</h3>
                <p>Global repository of all historic candidate records supporting bulk Excel export, candidate archive tools, and batch status transitions.</p>
            </div>

            <div id="ops-val-scheduling">
                <h3 class="subsection-title">3.4 For Ops Val Scheduling (<code>/recruiter/scheduling</code>)</h3>
                <p>Dedicated booking engine allowing recruiters to select qualified candidates and schedule final validation interviews with designated Operations Validators based on account assignment.</p>

                ${imgSchedulingMasterlist ? `
                <div class="browser-frame">
                    <div class="browser-header">
                        <div class="browser-dots">
                            <div class="dot dot-red"></div>
                            <div class="dot dot-yellow"></div>
                            <div class="dot dot-green"></div>
                        </div>
                        <div class="browser-url">https://chroniclev7.contactpoint360.com/recruiter/scheduling</div>
                    </div>
                    <div class="browser-content">
                        <img src="${imgSchedulingMasterlist}" alt="Ops Val Scheduling View" onclick="openLightbox(this.src)" />
                    </div>
                    <div class="screenshot-caption">Figure 3.4: Ops Validator Slot Scheduling Calendar & Candidate Queue.</div>
                </div>
                ` : ''}
            </div>
        </section>

        <!-- SECTION 04: RECRUITMENT - INTERVIEW MANAGEMENT -->
        <section id="interview-management" class="section-card searchable-section">
            <div class="section-header">
                <div class="section-number">04</div>
                <div class="section-title-text">Recruitment — Interview Management</div>
            </div>

            <div id="interview-rooms">
                <h3 class="subsection-title">4.1 Interview Rooms (<code>/recruiter/interview-rooms</code>)</h3>
                <p>Real-time room management board displaying Onsite and Online interview room availability (<code>AVAILABLE</code> vs <code>OCCUPIED</code>), candidate queues, and interviewer assignments.</p>

                ${imgInterviewRoomsGrid ? `
                <div class="browser-frame">
                    <div class="browser-header">
                        <div class="browser-dots">
                            <div class="dot dot-red"></div>
                            <div class="dot dot-yellow"></div>
                            <div class="dot dot-green"></div>
                        </div>
                        <div class="browser-url">https://chroniclev7.contactpoint360.com/recruiter/interview-rooms</div>
                    </div>
                    <div class="browser-content">
                        <img src="${imgInterviewRoomsGrid}" alt="Interview Rooms Status Board" onclick="openLightbox(this.src)" />
                    </div>
                    <div class="screenshot-caption">Figure 4.1: Real-Time Interview Rooms Status Board & Room Assignment Grid.</div>
                </div>
                ` : ''}

                <div class="callout callout-important">
                    <div class="callout-title"><span class="zoom-badge">KEY FEATURE</span> Dual-Role Interviewer Selector Architecture</div>
                    <p>When adding or editing an interview room in <strong>AddRoomModal</strong> or <strong>EditRoomModal</strong>, recruiters can dynamically set the assigned evaluator using strict role separation:</p>
                </div>

                <div class="step-container">
                    <div class="step-item">
                        <div class="step-badge">1</div>
                        <div class="step-content">
                            <div class="step-title">Select Mode Pill: [ Recruiter ] vs [ Ops Validator ]</div>
                            <div class="step-desc">Clicking <strong>[ Recruiter ]</strong> filters out all Operations Validators, presenting only recruiters in the dropdown.</div>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-badge">2</div>
                        <div class="step-content">
                            <div class="step-title">Ops Validator Target Account Selection</div>
                            <div class="step-desc">Clicking <strong>[ Ops Validator ]</strong> displays a <strong>Target Account</strong> prompt first. Selecting an account (e.g. <em>DoorDash</em>) dynamically populates the interviewer dropdown with only the Ops Validators assigned to that account.</div>
                        </div>
                    </div>
                </div>

                ${imgRoomEdit ? `
                <div class="browser-frame">
                    <div class="browser-header">
                        <div class="browser-dots">
                            <div class="dot dot-red"></div>
                            <div class="dot dot-yellow"></div>
                            <div class="dot dot-green"></div>
                        </div>
                        <div class="browser-url">Modal Overlay — Edit Interview Room</div>
                    </div>
                    <div class="browser-content">
                        <img src="${imgRoomEdit}" alt="Edit Interview Room Modal" onclick="openLightbox(this.src)" />
                    </div>
                    <div class="screenshot-caption">Figure 4.2: Edit Room Modal with Target Account & Dual-Role Interviewer Selector.</div>
                </div>
                ` : ''}

                ${imgRecruiterSelect ? `
                <div class="browser-frame">
                    <div class="browser-header">
                        <div class="browser-dots">
                            <div class="dot dot-red"></div>
                            <div class="dot dot-yellow"></div>
                            <div class="dot dot-green"></div>
                        </div>
                        <div class="browser-url">Modal Dropdown — Recruiter Filter</div>
                    </div>
                    <div class="browser-content">
                        <img src="${imgRecruiterSelect}" alt="Filtered Recruiter Selector" onclick="openLightbox(this.src)" />
                    </div>
                    <div class="screenshot-caption">Figure 4.3: Filtered Recruiter Selector Dropdown (Ops Validators Strictly Excluded).</div>
                </div>
                ` : ''}
            </div>

            <div id="queue-console">
                <h3 class="subsection-title">4.2 Queue Console (<code>/recruiter/queue-control</code>)</h3>
                <p>Live token calling console for dispatching candidates to interview rooms and broadcasting token calls to the public Queue Display screen (<code>/queue-display</code>).</p>
            </div>
        </section>

        <!-- SECTION 05: RECRUITMENT - HIRING & ACCOUNTS -->
        <section id="hiring-accounts" class="section-card searchable-section">
            <div class="section-header">
                <div class="section-number">05</div>
                <div class="section-title-text">Recruitment — Hiring & Accounts</div>
            </div>

            <div id="job-postings">
                <h3 class="subsection-title">5.1 Job Postings (<code>/job-postings</code>)</h3>
                <p>Public job portal displaying open positions, department badges, hiring requirements, and direct candidate registration links.</p>
            </div>

            <div id="accounts-support">
                <h3 class="subsection-title">5.2 Accounts & Support (<code>/admin/accounts</code>)</h3>
                <p>Administrative account registry for managing client accounts, hiring quotas, support roles, and sub-account allocations.</p>

                ${imgAccountRegistry ? `
                <div class="browser-frame">
                    <div class="browser-header">
                        <div class="browser-dots">
                            <div class="dot dot-red"></div>
                            <div class="dot dot-yellow"></div>
                            <div class="dot dot-green"></div>
                        </div>
                        <div class="browser-url">https://chroniclev7.contactpoint360.com/admin/hiring/accounts</div>
                    </div>
                    <div class="browser-content">
                        <img src="${imgAccountRegistry}" alt="Account Registry Header" onclick="openLightbox(this.src)" />
                    </div>
                    <div class="screenshot-caption">Figure 5.2: Account Registry Dashboard with Web App / Excel Views & Quota Management.</div>
                </div>
                ` : ''}
            </div>
        </section>

        <!-- SECTION 06: INSIGHTS & REPORTS -->
        <section id="insights-reports" class="section-card searchable-section">
            <div class="section-header">
                <div class="section-number">06</div>
                <div class="section-title-text">Insights & Reports</div>
            </div>

            <div id="report-dashboard">
                <h3 class="subsection-title">6.1 Report Dashboard (<code>/recruiter/reports</code>)</h3>
                <p>Executive reporting suite featuring account target analysis, candidate pass/fail rates, time-to-hire metrics, and recruiter conversion ratios.</p>
            </div>

            <div id="tests-tracker">
                <h3 class="subsection-title">6.2 Tests Tracker (<code>/recruiter/tracker/tests</code>)</h3>
                <p>Applicant assessment tracking portal recording typing test scores (Words Per Minute WPM, Accuracy %, duration, error logs).</p>
            </div>

            <div id="employee-tracker">
                <h3 class="subsection-title">6.3 Employee Tracker (<code>/admin/employee-tracker</code>)</h3>
                <p>Internal employee registry mapping staff IDs, assigned account teams, and operational statuses.</p>
            </div>

            <div id="security-logs">
                <h3 class="subsection-title">6.4 Security Logs (<code>/admin/audit-logs</code>)</h3>
                <p>Security audit log tracking user authentication attempts, candidate status modifications, room edits, and permission updates with IP address and timestamps.</p>
            </div>
        </section>

        <!-- SECTION 07: MHRT -->
        <section id="mhrt-module" class="section-card searchable-section">
            <div class="section-header">
                <div class="section-number">07</div>
                <div class="section-title-text">System & References — MHRT Module</div>
            </div>
            <p>The MHRT (Headcount-to-Revenue Requisition) module (<code>/recruiter/mhrt</code>) spans 6 operational sub-tabs:</p>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>MHRT Sub-Tab</th>
                        <th>Operational Scope & Workflow</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>H2R Creation</strong></td>
                        <td>Submit new headcount requisition requests mapped to client target accounts.</td>
                    </tr>
                    <tr>
                        <td><strong>H2R Division</strong></td>
                        <td>Allocate approved headcount slots across operational department divisions.</td>
                    </tr>
                    <tr>
                        <td><strong>Accounts</strong></td>
                        <td>Manage account code budget assignments and client billing references.</td>
                    </tr>
                    <tr>
                        <td><strong>Salary</strong></td>
                        <td>Configure pay bands, compensation rates, and target budget caps.</td>
                    </tr>
                    <tr>
                        <td><strong>Assigned Time Off</strong></td>
                        <td>Log operational holiday schedules, planned downtime, and leave allocations.</td>
                    </tr>
                    <tr>
                        <td><strong>Directory</strong></td>
                        <td>Access contact information for MHRT account leads and department managers.</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <!-- SECTION 08: CRM SETTINGS -->
        <section id="crm-settings" class="section-card searchable-section">
            <div class="section-header">
                <div class="section-number">08</div>
                <div class="section-title-text">System & References — CRM Settings</div>
            </div>
            <p>Administrative system configuration suite (<code>/admin/settings</code>) comprising 7 setup sub-tabs:</p>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Setting Sub-Tab</th>
                        <th>Scope & Setup Functionality</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Question Bank</strong></td>
                        <td>Manage interview scoring questions, competency weightings, and rubrics.</td>
                    </tr>
                    <tr>
                        <td><strong>Typing Test</strong></td>
                        <td>Configure typing test text prompts, 60s countdown timer, and passing WPM thresholds.</td>
                    </tr>
                    <tr>
                        <td><strong>Email Templates</strong></td>
                        <td>Edit automated candidate notification emails, interview invitations, and Job Offer letters.</td>
                    </tr>
                    <tr>
                        <td><strong>AI Settings</strong></td>
                        <td>Configure AI interview evaluation prompts, automated scoring weights, and feedback criteria.</td>
                    </tr>
                    <tr>
                        <td><strong>Active Tasks</strong></td>
                        <td>Monitor background database synchronization jobs, socket workers, and async tasks.</td>
                    </tr>
                    <tr>
                        <td><strong>Backups</strong></td>
                        <td>Create full database backups, restore system checkpoints, and clear temporary caches.</td>
                    </tr>
                    <tr>
                        <td><strong>User Management</strong></td>
                        <td>Create staff user accounts, assign roles (<span class="role-pill role-recruiter">recruiter_a</span>, <span class="role-pill role-ops">ops_validator</span>, <span class="role-pill role-admin">admin</span>), and scope target account access.</td>
                    </tr>
                </tbody>
            </table>
        </section>

    </main>

    <!-- LIGHTBOX MODAL -->
    <div id="lightboxModal" class="lightbox" onclick="closeLightbox()">
        <span class="lightbox-close">&times;</span>
        <img id="lightboxImg" src="" alt="Full Preview" />
    </div>

    <!-- CLIENT SEARCH & LIGHTBOX JS -->
    <script>
        function openLightbox(src) {
            document.getElementById('lightboxImg').src = src;
            document.getElementById('lightboxModal').style.display = 'flex';
        }

        function closeLightbox() {
            document.getElementById('lightboxModal').style.display = 'none';
        }

        function filterSections() {
            const input = document.getElementById('manualSearch').value.toLowerCase();
            const sections = document.querySelectorAll('.searchable-section');

            sections.forEach(section => {
                const text = section.innerText.toLowerCase();
                if (text.includes(input)) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>`;

    const outputPath = path.join(artifactDir, 'ChronicleV7_User_Manual.html');
    fs.writeFileSync(outputPath, htmlContent, 'utf-8');
    console.log('Executive Professional HTML User Manual written to:', outputPath);
}

generateHTML();
