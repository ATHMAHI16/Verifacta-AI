import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  BookOpen,
  Cpu,
  FileSearch,
  ShieldAlert,
  History,
  Settings,
  Search,
  Bell,
  User,
  Menu,
  X,
  RotateCcw,
  CheckCircle2,
  Info,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { useVerifacta } from '../context/VerifactaContext';
import { NavTab } from '../types';

const NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'policy-library', label: 'Policy Library', icon: BookOpen },
  { id: 'policy-compiler', label: 'Policy Compiler', icon: Cpu },
  { id: 'content-verification', label: 'Content Verification', icon: FileSearch },
  { id: 'red-team', label: 'Red-Team Testing', icon: ShieldAlert },
  { id: 'audit-trail', label: 'Audit Trail', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const PAGE_TITLES: Record<NavTab, string> = {
  overview: 'Overview',
  'policy-library': 'Policy Library',
  'policy-compiler': 'Policy Compiler',
  'content-verification': 'Content Verification',
  'red-team': 'Red-Team Testing',
  'audit-trail': 'Audit Trail',
  settings: 'Settings',
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    globalSearch,
    setGlobalSearch,
    policies,
    auditRecords,
    settings,
    setSelectedPolicyIdForDetail,
    setSelectedAuditIdForDetail,
    resetDemoData,
    toasts,
    dismissToast,
  } = useVerifacta();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const pendingReviews = auditRecords.filter(
    (r) => r.reviewStatus === 'Pending Review' || r.reviewStatus === 'Flagged'
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchQuery = globalSearch.trim().toLowerCase();
  const matchingPolicies = searchQuery
    ? policies.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery) ||
          p.category.toLowerCase().includes(searchQuery)
      )
    : [];
  const matchingAudits = searchQuery
    ? auditRecords.filter(
        (a) =>
          a.id.toLowerCase().includes(searchQuery) ||
          a.contentTitle.toLowerCase().includes(searchQuery)
      )
    : [];

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
          <button
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-500 transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
              Verifacta AI
            </span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.id === 'audit-trail' && pendingReviews.length > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {pendingReviews.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Environment Notice Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="text-xs text-slate-400 leading-relaxed">
            <p className="font-medium text-slate-300 mb-0.5">Phase 1 Foundation</p>
            <p className="text-[11px] text-slate-400">
              Deterministic simulation mode · Local workspace storage
            </p>
          </div>
          <button
            onClick={resetDemoData}
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-800 rounded-md border border-slate-700/80 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          {/* Left Zone: Mobile Menu Toggle + Current Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg font-bold text-slate-900 tracking-tight truncate">
              {PAGE_TITLES[activeTab]}
            </h1>
          </div>

          {/* Center/Right Zone: Global Search, Notifications, User Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Field */}
            <div ref={searchRef} className="relative w-44 sm:w-64 md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onFocus={() => setSearchDropdownOpen(true)}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                placeholder="Search policies, clauses, or reviews..."
                className="w-full pl-9 pr-7 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
              />
              {globalSearch && (
                <button
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Quick Search Results Popover */}
              {searchDropdownOpen && searchQuery.length > 0 && (
                <div className="absolute right-0 left-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50 max-h-80 overflow-y-auto">
                  <div className="px-3 py-1 text-[11px] font-medium text-slate-400">
                    Matching Policies ({matchingPolicies.length})
                  </div>
                  {matchingPolicies.length === 0 ? (
                    <div className="px-3 py-1.5 text-xs text-slate-500">No matching policies</div>
                  ) : (
                    matchingPolicies.slice(0, 3).map((pol) => (
                      <button
                        key={pol.id}
                        onClick={() => {
                          setSelectedPolicyIdForDetail(pol.id);
                          setActiveTab('policy-library');
                          setSearchDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-slate-900 truncate">{pol.name}</span>
                        <span className="font-mono text-slate-500 ml-2 shrink-0">
                          {pol.version}
                        </span>
                      </button>
                    ))
                  )}

                  <div className="border-t border-slate-100 my-1" />
                  <div className="px-3 py-1 text-[11px] font-medium text-slate-400">
                    Matching Audit Reviews ({matchingAudits.length})
                  </div>
                  {matchingAudits.length === 0 ? (
                    <div className="px-3 py-1.5 text-xs text-slate-500">No matching reviews</div>
                  ) : (
                    matchingAudits.slice(0, 3).map((aud) => (
                      <button
                        key={aud.id}
                        onClick={() => {
                          setSelectedAuditIdForDetail(aud.id);
                          setActiveTab('audit-trail');
                          setSearchDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-slate-900 truncate">
                          {aud.contentTitle}
                        </span>
                        <span className="font-mono text-slate-500 ml-2 shrink-0">{aud.id}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Notifications Menu */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {pendingReviews.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white font-mono text-[10px] font-semibold flex items-center justify-center tabular-nums">
                    {pendingReviews.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      Compliance Review Queue
                    </span>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      {pendingReviews.length} pending
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {pendingReviews.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-500">
                        All flagged items have been reviewed.
                      </div>
                    ) : (
                      pendingReviews.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedAuditIdForDetail(item.id);
                            setActiveTab('audit-trail');
                            setNotificationsOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900 truncate">
                              {item.contentTitle}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                              {item.id} · {item.reviewStatus}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        </button>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setActiveTab('audit-trail');
                        setNotificationsOpen(false);
                      }}
                      className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Open Audit Trail
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
                aria-label="User profile menu"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {settings.reviewerName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="hidden md:block min-w-0">
                  <p className="text-xs font-semibold text-slate-900 leading-tight truncate">
                    {settings.reviewerName}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-tight truncate max-w-[140px]">
                    {settings.organizationName}
                  </p>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{settings.reviewerName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{settings.reviewerRole}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setActiveTab('settings');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reviewer Profile & Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        resetDemoData();
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Workspace Demo State</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Toast Notification Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-slate-900 text-white border border-slate-800 rounded-lg shadow-lg px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                {toast.type === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {toast.type === 'info' && (
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                )}
                {toast.type === 'warning' && (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-xs font-semibold">{toast.title}</p>
                  {toast.description && (
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      {toast.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-white p-0.5"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
