import { useCallback, type KeyboardEvent, type ReactNode } from 'react';
import { Nav } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';

type TabId = 'ringkasan' | 'listrik';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'ringkasan', label: 'Ringkasan', icon: '🏠' },
  { id: 'listrik', label: 'Listrik & Air', icon: '⚡' },
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
  const activeTab = validTab;

  const handleTabChange = useCallback(
    (tab: TabId) => {
      const next = new URLSearchParams(searchParams);
      if (tab === 'ringkasan') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      setSearchParams(next, { replace: true });
      requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        document.getElementById(`stay-tab-mobile-${tab}`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    },
    [searchParams, setSearchParams],
  );

  const handleTabKeyDown = (event: KeyboardEvent<HTMLElement>, index: number, mobile = false) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = TABS.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    const nextTab = TABS[nextIndex];
    handleTabChange(nextTab.id);
    requestAnimationFrame(() => document.getElementById(`${mobile ? 'stay-tab-mobile' : 'stay-tab'}-${nextTab.id}`)?.focus());
  };

  return (
    <div className="stay-tabs">
      {/* Desktop: Nav pills */}
      <Nav variant="pills" className="stay-tabs-nav d-none d-sm-flex" activeKey={activeTab} role="tablist" aria-label="Bagian Panduan Kos Saya">
        {TABS.map((tab, index) => (
          <Nav.Item key={tab.id}>
            <Nav.Link
              as="button"
              type="button"
              id={`stay-tab-${tab.id}`}
              eventKey={tab.id}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className="stay-tab-link"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`stay-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
            >
              <span className="stay-tab-icon" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {/* Mobile: horizontal scroll pills */}
      <div className="stay-tabs-mobile d-sm-none" role="tablist" aria-label="Bagian Panduan Kos Saya">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            id={`stay-tab-mobile-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`stay-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`stay-tab-mobile-pill ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index, true)}
          >
            <span aria-hidden="true">{tab.icon}</span>
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
