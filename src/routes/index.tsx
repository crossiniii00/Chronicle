import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { lazyRetry } from '@/utils/lazyRetry';
import { useAccountTypeSettings } from '@/pages/admin/hooks/useAccountTypeSettings';

// Layouts
import { RecruiterLayout, GuestInterviewerLayout, AdminLayout } from '@/layouts/PortalLayouts';

// Lazy loaded components
const LoginPage = lazyRetry(() => import('@/pages/auth/Login').then(mod => ({ default: mod.LoginPage })));
// Public
const QueueDisplay = lazyRetry(() => import('@/pages/public/QueueDisplay').then(mod => ({ default: mod.QueueDisplay })));
const ApplicationFlow = lazyRetry(() => import('@/pages/applicant/ApplicationFlow').then(mod => ({ default: mod.ApplicationFlow })));
const JobPostings = lazyRetry(() => import('@/pages/applicant/JobPostings').then(mod => ({ default: mod.JobPostings })));

// Recruiter
const RecruiterDashboard = lazyRetry(() => import('@/pages/recruiter/Dashboard').then(mod => ({ default: mod.RecruiterDashboard })));
const ApplicantManagement = lazyRetry(() => import('@/pages/recruiter/ApplicantManagement').then(mod => ({ default: mod.ApplicantManagement })));
const InterviewRooms = lazyRetry(() => import('@/pages/recruiter/InterviewRooms').then(mod => ({ default: mod.InterviewRooms })));
const QueueControl = lazyRetry(() => import('@/pages/recruiter/QueueControl').then(mod => ({ default: mod.QueueControl })));
const RecruiterReports = lazyRetry(() => import('@/pages/recruiter/Reports').then(mod => ({ default: mod.RecruiterReports })));
const RecruiterAudit = lazyRetry(() => import('@/pages/recruiter/AuditTrail').then(mod => ({ default: mod.RecruiterAudit })));
const RecruiterNotifications = lazyRetry(() => import('@/pages/recruiter/Notifications').then(mod => ({ default: mod.RecruiterNotifications })));
const RecruiterProfile = lazyRetry(() => import('@/pages/recruiter/Profile').then(mod => ({ default: mod.RecruiterProfile })));
const InterviewManagementView = lazyRetry(() => import('@/pages/recruiter/InterviewManagementView').then(mod => ({ default: mod.InterviewManagementView })));

// New Tracker Views
const ManagementView = lazyRetry(() => import('@/pages/recruiter/tracker/ManagementView').then(mod => ({ default: mod.ManagementView })));
const InterviewReportsView = lazyRetry(() => import('@/pages/recruiter/tracker/InterviewReportsView').then(mod => ({ default: mod.InterviewReportsView })));
const MasterlistView = lazyRetry(() => import('@/pages/recruiter/tracker/MasterlistView').then(mod => ({ default: mod.MasterlistView })));
const InactiveView = lazyRetry(() => import('@/pages/recruiter/tracker/InactiveView').then(mod => ({ default: mod.InactiveView })));
const HiringReportsView = lazyRetry(() => import('@/pages/recruiter/tracker/HiringReportsView').then(mod => ({ default: mod.HiringReportsView })));
const TestsTrackerView = lazyRetry(() => import('@/pages/recruiter/tracker/TestsTrackerView').then(mod => ({ default: mod.TestsTrackerView })));

const EndorsedView = lazyRetry(() => import('@/pages/recruiter/tracker/EndorsedView').then(mod => ({ default: mod.EndorsedView })));
const SchedulingView = lazyRetry(() => import('@/pages/recruiter/SchedulingView').then(mod => ({ default: mod.SchedulingView })));

const MHRTView = lazyRetry(() => import('@/pages/recruiter/mhrt/MHRTView').then(mod => ({ default: mod.MHRTView })));
const H2RCreationView = lazyRetry(() => import('@/pages/recruiter/mhrt/H2RCreationView').then(mod => ({ default: mod.H2RCreationView })));
const SalaryTab = lazyRetry(() => import('@/pages/recruiter/mhrt/SalaryTab').then(mod => ({ default: mod.SalaryTab })));
const AccountsTab = lazyRetry(() => import('@/pages/recruiter/mhrt/AccountsTab').then(mod => ({ default: mod.AccountsTab })));
const H2RCreationTab = lazyRetry(() => import('@/pages/recruiter/mhrt/H2RCreationTab').then(mod => ({ default: mod.H2RCreationTab })));
const DirectoryTab = lazyRetry(() => import('@/pages/recruiter/mhrt/DirectoryTab').then(mod => ({ default: mod.DirectoryTab })));
const H2RDivisionTab = lazyRetry(() => import('@/pages/recruiter/mhrt/H2RDivisionTab').then(mod => ({ default: mod.H2RDivisionTab })));
const AssignedTimeOffTab = lazyRetry(() => import('@/pages/recruiter/mhrt/AssignedTimeOffTab').then(mod => ({ default: mod.AssignedTimeOffTab })));

// Guest Interviewer
const FinalInterviewDashboard = lazyRetry(() => import('@/pages/guest/FinalInterviewDashboard').then(mod => ({ default: mod.FinalInterviewDashboard })));
const InterviewDesk = lazyRetry(() => import('@/pages/guest/InterviewDesk').then(mod => ({ default: mod.InterviewDesk })));
const FinalInterviewHistory = lazyRetry(() => import('@/pages/guest/EvaluationHistory').then(mod => ({ default: mod.InterviewRegistryHistory })));
const FinalInterviewAnalysis = lazyRetry(() => import('@/pages/guest/AccountAnalysis').then(mod => ({ default: mod.AccountAnalysis })));

// Forums
const ForumsView = lazyRetry(() => import('@/pages/common/forums/ForumsView').then(mod => ({ default: mod.ForumsView })));
const GuestNotifications = lazyRetry(() => import('@/pages/guest/Notifications').then(mod => ({ default: mod.GuestNotifications })));
const GuestProfile = lazyRetry(() => import('@/pages/guest/Profile').then(mod => ({ default: mod.GuestProfile })));
const GuestTeam = lazyRetry(() => import('@/pages/guest/Team').then(mod => ({ default: mod.GuestTeam })));
const FinalInterviewSchedules = lazyRetry(() => import('@/pages/guest/Schedules').then(mod => ({ default: mod.FinalInterviewSchedules })));

// Admin
const AdminDashboard = lazyRetry(() => import('@/pages/admin/Dashboard').then(mod => ({ default: mod.AdminDashboard })));
const UserManagement = lazyRetry(() => import('@/pages/admin/UserManagement').then(mod => ({ default: mod.UserManagement })));
const PositionManagement = lazyRetry(() => import('@/pages/common/PositionManagement'));
const InterviewQuestions = lazyRetry(() => import('@/pages/admin/InterviewQuestions').then(mod => ({ default: mod.InterviewQuestions })));
const QueueSettings = lazyRetry(() => import('@/pages/admin/QueueSettings').then(mod => ({ default: mod.QueueSettings })));
const AdminReports = lazyRetry(() => import('@/pages/admin/Reports').then(mod => ({ default: mod.AdminReports })));
const AdminAuditLogs = lazyRetry(() => import('@/pages/admin/AuditLogs').then(mod => ({ default: mod.AdminAuditLogs })));
const BackupRestore = lazyRetry(() => import('@/pages/admin/Backup').then(mod => ({ default: mod.BackupRestore })));
const AdminNotifications = lazyRetry(() => import('@/pages/admin/Notifications').then(mod => ({ default: mod.AdminNotifications })));
const AdminProfile = lazyRetry(() => import('@/pages/admin/Profile').then(mod => ({ default: mod.AdminProfile })));
const EmployeeTracker = lazyRetry(() => import('@/pages/admin/EmployeeTracker').then(mod => ({ default: mod.EmployeeTracker })));
const AccountManagement = lazyRetry(() => import('@/pages/admin/AccountManagement').then(mod => ({ default: mod.AccountManagement })));
const ProjectRSettings = lazyRetry(() => import('@/pages/admin/ProjectRSettings').then(mod => ({ default: mod.ProjectRSettings })));
const EmailTemplatesTab = lazyRetry(() => import('@/pages/admin/ProjectRSettings/EmailTemplatesTab').then(mod => ({ default: mod.EmailTemplatesTab })));
const TypingTestTab = lazyRetry(() => import('@/pages/admin/ProjectRSettings/TypingTestTab').then(mod => ({ default: mod.TypingTestTab })));
const AISettingsTab = lazyRetry(() => import('@/pages/admin/ProjectRSettings/AISettingsTab').then(mod => ({ default: mod.AISettingsTab })));

// Loading component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-[#f3f2f1]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-brand-red/20 border-t-brand-red rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Initialising Hub...</p>
        </div>
    </div>
);

// Route guards
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

function RoleRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
    const { user } = useAuthStore();
    const location = useLocation();
    const { hasPermissionForPath, getRoleType } = useAccountTypeSettings();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const userRoleType = getRoleType(user.role);
    const hasRole = allowedRoles.includes(user.role) || allowedRoles.some(r => getRoleType(r) === userRoleType);

    if (!hasRole) {
        return <Navigate to={getRoleHome(user.role, userRoleType)} replace />;
    }

    if (!hasPermissionForPath(user.role, location.pathname)) {
        return <Navigate to={getRoleHome(user.role, userRoleType)} replace />;
    }

    return <>{children}</>;
}

function getRoleHome(role?: UserRole, roleType?: string): string {
    if (!role) return '/jobs';
    
    if (roleType === 'admin' || roleType === 'super_admin' || role === 'admin' || role === 'super_admin') {
        return '/admin/dashboard';
    }
    if (roleType === 'ops_validator' || role === 'ops_validator' || role === 'guest_interviewer') {
        return '/final-interview/dashboard';
    }
    
    return '/recruiter/dashboard';
}

function AuthRedirect() {
    const { isAuthenticated, user } = useAuthStore();
    const { getRoleType } = useAccountTypeSettings();
    if (isAuthenticated && user) {
        const roleType = getRoleType(user.role);
        return <Navigate to={getRoleHome(user.role, roleType)} replace />;
    }
    return <Navigate to="/login" replace />;
}

export function AppRoutes() {
    useLocation();

    return (
        <Routes>
            {/* Root redirect */}
            <Route path="/" element={<AuthRedirect />} />

            {/* Public pages */}
            <Route path="/jobs" element={<Suspense fallback={<PageLoader />}><JobPostings /></Suspense>} />
            <Route path="/apply" element={<Suspense fallback={<PageLoader />}><ApplicationFlow /></Suspense>} />
            <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
            <Route path="/queue-display" element={<Suspense fallback={<PageLoader />}><QueueDisplay /></Suspense>} />

            <Route path="/recruiter" element={<ProtectedRoute><RoleRoute allowedRoles={['recruiter_s', 'recruiter_a', 'recruiter_jc', 'recruiter_sy', 'recruiter_interviewer']}><RecruiterLayout /></RoleRoute></ProtectedRoute>}>
                <Route index element={<Navigate to="/recruiter/dashboard" replace />} />
                <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><RecruiterDashboard /></Suspense>} />
                <Route path="forums" element={<Suspense fallback={<PageLoader />}><ForumsView /></Suspense>} />

                {/* New Nested Tracker */}
                <Route path="tracker">
                    <Route index element={<Navigate to="management" replace />} />
                    <Route path="management/*" element={<Suspense fallback={<PageLoader />}><ManagementView /></Suspense>} />
                    <Route path="interview-form" element={<Suspense fallback={<PageLoader />}><InterviewReportsView /></Suspense>} />
                    <Route path="masterlist" element={<Suspense fallback={<PageLoader />}><MasterlistView /></Suspense>} />
                    <Route path="endorsed" element={<Suspense fallback={<PageLoader />}><EndorsedView /></Suspense>} />
                    <Route path="inactive" element={<Suspense fallback={<PageLoader />}><InactiveView /></Suspense>} />
                    <Route path="reports" element={<Suspense fallback={<PageLoader />}><HiringReportsView /></Suspense>} />
                    <Route path="typing-test-tracker" element={<Suspense fallback={<PageLoader />}><TestsTrackerView /></Suspense>} />
                    <Route path="scheduling" element={<Suspense fallback={<PageLoader />}><SchedulingView /></Suspense>} />
                </Route>



                {/* Interview Section */}
                <Route path="interview" element={<Suspense fallback={<PageLoader />}><InterviewManagementView /></Suspense>}>
                    <Route index element={<Navigate to="rooms" replace />} />
                    <Route path="rooms" element={<Suspense fallback={<PageLoader />}><InterviewRooms /></Suspense>} />
                    <Route path="queue" element={<Suspense fallback={<PageLoader />}><QueueControl /></Suspense>} />
                    <Route path="scheduling" element={<Navigate to="/recruiter/tracker/scheduling" replace />} />
                </Route>

                <Route path="rooms" element={<Navigate to="/recruiter/interview/rooms" replace />} />
                <Route path="queue" element={<Navigate to="/recruiter/interview/queue" replace />} />
                <Route path="reports" element={<Suspense fallback={<PageLoader />}><RecruiterReports /></Suspense>} />
                <Route path="audit" element={<Suspense fallback={<PageLoader />}><RecruiterAudit /></Suspense>} />
                <Route path="notifications" element={<Suspense fallback={<PageLoader />}><RecruiterNotifications /></Suspense>} />
                <Route path="profile" element={<Suspense fallback={<PageLoader />}><RecruiterProfile /></Suspense>} />
                <Route path="applicants/*" element={<Suspense fallback={<PageLoader />}><ApplicantManagement /></Suspense>} />
                <Route path="positions" element={<Suspense fallback={<PageLoader />}><PositionManagement /></Suspense>} />

                {/* MHRT Section */}
                <Route path="mhrt" element={<Suspense fallback={<PageLoader />}><MHRTView /></Suspense>}>
                    <Route index element={<Navigate to="salary" replace />} />
                    <Route path="salary" element={<Suspense fallback={<PageLoader />}><SalaryTab /></Suspense>} />
                    <Route path="accounts" element={<Suspense fallback={<PageLoader />}><AccountsTab /></Suspense>} />
                    <Route path="directory" element={<Suspense fallback={<PageLoader />}><DirectoryTab /></Suspense>} />

                    {/* Nested H2R Hub */}
                    <Route path="h2r-creation" element={<Suspense fallback={<PageLoader />}><H2RCreationView /></Suspense>}>
                        <Route index element={<Navigate to="accounts" replace />} />
                        <Route path="accounts" element={<Suspense fallback={<PageLoader />}><H2RCreationTab /></Suspense>} />
                        <Route path="division" element={<Suspense fallback={<PageLoader />}><H2RDivisionTab /></Suspense>} />
                        <Route path="time-off" element={<Suspense fallback={<PageLoader />}><AssignedTimeOffTab /></Suspense>} />
                    </Route>
                </Route>

                {/* Decentralized Settings for Recruiter */}
                <Route path="settings" element={<Suspense fallback={<PageLoader />}><ProjectRSettings /></Suspense>}>
                    <Route index element={<Navigate to="job-postings" replace />} />
                    <Route path="job-postings" element={<Suspense fallback={<PageLoader />}><PositionManagement hideHeader={true} /></Suspense>} />
                    <Route path="questions" element={<Suspense fallback={<PageLoader />}><InterviewQuestions /></Suspense>} />
                    <Route path="typing-test" element={<Suspense fallback={<PageLoader />}><TypingTestTab /></Suspense>} />
                    <Route path="accounts" element={<Suspense fallback={<PageLoader />}><AccountManagement hideHeader={true} /></Suspense>} />
                    <Route path="email-templates" element={<Suspense fallback={<PageLoader />}><EmailTemplatesTab /></Suspense>} />
                    <Route path="ai" element={<Suspense fallback={<PageLoader />}><AISettingsTab /></Suspense>} />
                </Route>
            </Route>

            <Route path="/final-interview" element={<ProtectedRoute><RoleRoute allowedRoles={['ops_validator', 'guest_interviewer']}><GuestInterviewerLayout /></RoleRoute></ProtectedRoute>}>
                <Route index element={<Navigate to="/final-interview/dashboard" replace />} />
                <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><FinalInterviewDashboard /></Suspense>} />
                <Route path="desk" element={<Suspense fallback={<PageLoader />}><InterviewDesk /></Suspense>} />
                <Route path="forums" element={<Suspense fallback={<PageLoader />}><ForumsView /></Suspense>} />
                <Route path="history" element={<Suspense fallback={<PageLoader />}><FinalInterviewHistory /></Suspense>} />
                <Route path="analysis" element={<Suspense fallback={<PageLoader />}><FinalInterviewAnalysis /></Suspense>} />
                <Route path="schedules" element={<Suspense fallback={<PageLoader />}><FinalInterviewSchedules /></Suspense>} />
                <Route path="notifications" element={<Suspense fallback={<PageLoader />}><GuestNotifications /></Suspense>} />
                <Route path="profile" element={<Suspense fallback={<PageLoader />}><GuestProfile /></Suspense>} />
                <Route path="team" element={<Suspense fallback={<PageLoader />}><GuestTeam /></Suspense>} />
            </Route>

            <Route path="/admin" element={<ProtectedRoute><RoleRoute allowedRoles={['admin', 'super_admin']}><AdminLayout /></RoleRoute></ProtectedRoute>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
                <Route path="forums" element={<Suspense fallback={<PageLoader />}><ForumsView /></Suspense>} />
                <Route path="calendar" element={<Suspense fallback={<PageLoader />}><FinalInterviewSchedules /></Suspense>} />
                <Route path="users" element={<Suspense fallback={<PageLoader />}><UserManagement /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<PageLoader />}><ProjectRSettings /></Suspense>}>
                    <Route index element={<Navigate to="job-postings" replace />} />
                    <Route path="job-postings" element={<Suspense fallback={<PageLoader />}><PositionManagement hideHeader={true} /></Suspense>} />
                    <Route path="questions" element={<Suspense fallback={<PageLoader />}><InterviewQuestions /></Suspense>} />
                    <Route path="typing-test" element={<Suspense fallback={<PageLoader />}><TypingTestTab /></Suspense>} />
                    <Route path="accounts" element={<Suspense fallback={<PageLoader />}><AccountManagement hideHeader={true} /></Suspense>} />
                    <Route path="email-templates" element={<Suspense fallback={<PageLoader />}><EmailTemplatesTab /></Suspense>} />
                    <Route path="ai" element={<Suspense fallback={<PageLoader />}><AISettingsTab /></Suspense>} />
                </Route>
                <Route path="tracker">
                    <Route index element={<Navigate to="management" replace />} />
                    <Route path="management/*" element={<Suspense fallback={<PageLoader />}><ManagementView /></Suspense>} />
                    <Route path="interview-form" element={<Suspense fallback={<PageLoader />}><InterviewReportsView /></Suspense>} />
                    <Route path="masterlist" element={<Suspense fallback={<PageLoader />}><MasterlistView /></Suspense>} />
                    <Route path="inactive" element={<Suspense fallback={<PageLoader />}><InactiveView /></Suspense>} />
                    <Route path="reports" element={<Suspense fallback={<PageLoader />}><HiringReportsView /></Suspense>} />
                    <Route path="typing-test-tracker" element={<Suspense fallback={<PageLoader />}><TestsTrackerView /></Suspense>} />
                    <Route path="scheduling" element={<Suspense fallback={<PageLoader />}><SchedulingView /></Suspense>} />
                </Route>



                {/* Interview Section */}
                <Route path="interview" element={<Suspense fallback={<PageLoader />}><InterviewManagementView /></Suspense>}>
                    <Route index element={<Navigate to="rooms" replace />} />
                    <Route path="rooms" element={<Suspense fallback={<PageLoader />}><InterviewRooms /></Suspense>} />
                    <Route path="queue" element={<Suspense fallback={<PageLoader />}><QueueControl /></Suspense>} />
                    <Route path="scheduling" element={<Navigate to="/admin/tracker/scheduling" replace />} />
                </Route>

                <Route path="rooms" element={<Navigate to="/admin/interview/rooms" replace />} />
                <Route path="queue" element={<Navigate to="/admin/interview/queue" replace />} />

                {/* MHRT Section for Admin */}
                <Route path="mhrt" element={<Suspense fallback={<PageLoader />}><MHRTView /></Suspense>}>
                    <Route index element={<Navigate to="salary" replace />} />
                    <Route path="salary" element={<Suspense fallback={<PageLoader />}><SalaryTab /></Suspense>} />
                    <Route path="accounts" element={<Suspense fallback={<PageLoader />}><AccountsTab /></Suspense>} />
                    <Route path="directory" element={<Suspense fallback={<PageLoader />}><DirectoryTab /></Suspense>} />

                    {/* Nested H2R Hub */}
                    <Route path="h2r-creation" element={<Suspense fallback={<PageLoader />}><H2RCreationView /></Suspense>}>
                        <Route index element={<Navigate to="accounts" replace />} />
                        <Route path="accounts" element={<Suspense fallback={<PageLoader />}><H2RCreationTab /></Suspense>} />
                        <Route path="division" element={<Suspense fallback={<PageLoader />}><H2RDivisionTab /></Suspense>} />
                        <Route path="time-off" element={<Suspense fallback={<PageLoader />}><AssignedTimeOffTab /></Suspense>} />
                    </Route>
                </Route>
                <Route path="applicants/*" element={<Suspense fallback={<PageLoader />}><ApplicantManagement /></Suspense>} />
                <Route path="queue-settings" element={<Suspense fallback={<PageLoader />}><QueueSettings /></Suspense>} />
                <Route path="employee-tracker" element={<Suspense fallback={<PageLoader />}><EmployeeTracker /></Suspense>} />
                <Route path="reports" element={<Suspense fallback={<PageLoader />}><AdminReports /></Suspense>} />
                <Route path="audit" element={<Suspense fallback={<PageLoader />}><AdminAuditLogs /></Suspense>} />
                <Route path="backup" element={<Suspense fallback={<PageLoader />}><BackupRestore /></Suspense>} />
                <Route path="notifications" element={<Suspense fallback={<PageLoader />}><AdminNotifications /></Suspense>} />
                <Route path="profile" element={<Suspense fallback={<PageLoader />}><AdminProfile /></Suspense>} />
            </Route>

            <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-6xl font-black text-surface-900 mb-4 tracking-tighter">404</h1>
                        <p className="text-gray-400 mb-6">Page not found</p>
                        <a href="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors">Go Home</a>
                    </div>
                </div>
            } />
        </Routes>
    );
}
