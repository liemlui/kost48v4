import { useState, useCallback, type ReactNode } from 'react';
import { Nav } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';

type TabId = 'ringkasan' | 'listrik' | 'kamar';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'ringkasan', label: 'Ringkasan', icon: '🏠' },
  { id: 'listrik', label: 'Listrik & Air', icon: '⚡' },
  { id: 'kamar', label: 'Kamar & Riwayat', icon: '🛏️' },
];

type StayTabsProps = {
  children: (activeTab: TabId) => ReactNode;
};

/**
 * Tab navigation for MyStayPage. Supports URL query param (?tab=listrik) 
 * for bookmark-ability. Desktop: Nav pills. Mobile: horizontal scroll pills.
 */
export default function StayTabs({ children }: StayTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabId | null;
  const validTab = tabFromUrl && TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : 'ringkasan';
  const [activeTab, setActiveTab] = useState<TabId>(validTab);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      const next = new URLSearchParams(searchParams);
      if (tab === 'ringkasan') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return (
    <div className="stay-tabs">
      {/* Desktop: Nav pills */}
      <Nav variant="pills" className="stay-tabs-nav d-none d-sm-flex" activeKey={activeTab}>
        {TABS.map((tab) => (
          <Nav.Item key={tab.id}>
            <Nav.Link
              eventKey={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="stay-tab-link"
            >
              <span className="stay-tab-icon">{tab.icon}</span>
              {tab.label}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {/* Mobile: horizontal scroll pills */}
      <div className="stay-tabs-mobile d-sm-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`stay-tab-mobile-pill ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="stay-tabs-content">
        {children(activeTab)}
      </div>
    </div>
  );
}
