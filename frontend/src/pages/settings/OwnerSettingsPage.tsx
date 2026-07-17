// FILE: OwnerSettingsPage.tsx — shell Pengaturan Owner
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';
import { Tab, Tabs } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import {
  AiDraftQueuePanel,
  AiSettingsPanel,
  FacilityPhotoPanel,
  FaqManagementPanel,
  MarketingAssetPanel,
  RoomPhotoPanel,
  TariffSettingsPanel,
} from '../../components/settings/OwnerSettingsPanels';

const SETTINGS_TABS = new Set(['faq', 'photos', 'facility-photos', 'marketing-assets', 'tarif', 'ai', 'ai-drafts']);

export default function OwnerSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && SETTINGS_TABS.has(tabParam) ? tabParam : 'faq';

  return (
    <FeatureErrorBoundary>
      <div>
        <PageHeader
          eyebrow="Owner · Pengaturan"
          title="Pengaturan Aplikasi"
          description="Kelola FAQ publik, foto kamar, dan tarif/konstanta operasional."
        />
        <div className="settings-page">
          <Tabs
            activeKey={activeTab}
            onSelect={(key) => {
              if (!key || !SETTINGS_TABS.has(key)) return;
              const next = new URLSearchParams(searchParams);
              next.set('tab', key);
              setSearchParams(next, { replace: true });
            }}
            className="command-tabs mb-4"
          >
            <Tab eventKey="faq" title="FAQ Publik"><FaqManagementPanel /></Tab>
            <Tab eventKey="photos" title="Foto Kamar"><RoomPhotoPanel /></Tab>
            <Tab eventKey="facility-photos" title="Foto Fasilitas"><FacilityPhotoPanel /></Tab>
            <Tab eventKey="marketing-assets" title="Aset Publik"><MarketingAssetPanel /></Tab>
            <Tab eventKey="tarif" title="Tarif & Konstanta"><TariffSettingsPanel /></Tab>
            <Tab eventKey="ai" title="AI & Biaya"><AiSettingsPanel /></Tab>
            <Tab eventKey="ai-drafts" title="Antrean Draft AI"><AiDraftQueuePanel /></Tab>
          </Tabs>
        </div>
      </div>
    </FeatureErrorBoundary>
  );
}
