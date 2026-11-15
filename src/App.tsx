import React, { useState, useMemo } from 'react';
import type { View, Scenario } from '@/types';
import { sites, getSite } from '@/data/sites';
import { DEFAULT_SCENARIO, getSummary } from '@/lib/scenarioCalculations';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AstraPanel } from '@/components/assistant/AstraPanel';
import { CustomCursor } from '@/components/reactbits/CustomCursor';
import { OverviewView } from '@/views/OverviewView';
import { GlobeView } from '@/views/GlobeView';
import { SitesView } from '@/views/SitesView';
import { AnalysisView } from '@/views/AnalysisView';
import { CompareView } from '@/views/CompareView';
import { ScenarioView } from '@/views/ScenarioView';
import { AstraView } from '@/views/AstraView';
import { SiteTerrain3D } from '@/components/terrain/SiteTerrain3D';
import SiteTerrainView from '@/components/sites/SiteTerrainView';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('overview');
  const [selectedSiteId, setSelectedSiteId] = useState('shackleton-ridge');
  const [compareIds, setCompareIds] = useState<string[]>([
    'shackleton-ridge',
    'mons-mouton',
    'malapert-a',
  ]);
  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [astraOpen, setAstraOpen] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<'charts' | 'terrain'>('charts');

  const selectedSite = getSite(selectedSiteId);
  const selectedSummary = useMemo(
    () => getSummary(selectedSite, scenario),
    [selectedSite, scenario]
  );
  const comparisonSites = useMemo(
    () => compareIds.map(getSite),
    [compareIds]
  );

  const handleNavigate = (view: View) => {
    setActiveView(view);
    if (window.innerWidth < 900) {
      setSidebarOpen(false);
    }
  };

  const handleOpenSite = (id: string) => {
    setSelectedSiteId(id);
    setAnalysisTab('charts');
    handleNavigate('analysis');
  };

  const handleVisitTerrain = (id?: string) => {
    if (id) setSelectedSiteId(id);
    handleNavigate('terrain');
  };

  const handleToggleCompare = (id: string) => {
    setCompareIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 6
        ? [...current, id]
        : current
    );
  };

  const handleUpdateScenario = <K extends keyof Scenario>(key: K, value: Scenario[K]) => {
    setScenario((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="app-shell">
      <CustomCursor />
      {/* Left Collapsible Navigation Sidebar */}
      <Sidebar
        activeView={activeView}
        sidebarOpen={sidebarOpen}
        onNavigate={handleNavigate}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main Mission Control Content Area */}
      <main className="main-area">
        <Topbar
          activeView={activeView}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <div className="page-content">
          {activeView === 'overview' && (
            <OverviewView
              scenario={scenario}
              selectedSiteId={selectedSiteId}
              onSelectSite={setSelectedSiteId}
              onOpenSite={handleVisitTerrain}
              onNavigate={handleNavigate}
            />
          )}

          {activeView === 'globe' && (
            <GlobeView
              scenario={scenario}
              selectedSiteId={selectedSiteId}
              onSelectSite={setSelectedSiteId}
              onOpenSite={handleOpenSite}
            />
          )}

          {activeView === 'terrain' && (
            <div className="view-stack">
              <div style={{ width: '100%', minHeight: 'calc(100vh - 120px)' }}>
                <SiteTerrainView
                    site={selectedSite}
                    date={scenario.date}
                    onSelectSite={setSelectedSiteId}
                />
              </div>
            </div>
          )}

          {activeView === 'sites' && (
            <SitesView
              scenario={scenario}
              selectedSiteId={selectedSiteId}
              compareIds={compareIds}
              onSelectSite={setSelectedSiteId}
              onToggleCompare={handleToggleCompare}
              onOpenSite={handleOpenSite}
            />
          )}

          {activeView === 'analysis' && (
            <AnalysisView
              site={selectedSite}
              scenario={scenario}
              onSelectSite={setSelectedSiteId}
              onNavigate={handleNavigate}
              initialTab={analysisTab}
            />
          )}

          {activeView === 'compare' && (
            <CompareView
              scenario={scenario}
              compareIds={compareIds}
              onToggleCompare={handleToggleCompare}
              onOpenSite={handleOpenSite}
            />
          )}

          {activeView === 'scenario' && (
            <ScenarioView
              site={selectedSite}
              scenario={scenario}
              onUpdateScenario={handleUpdateScenario}
              onSelectSite={setSelectedSiteId}
              onNavigate={handleNavigate}
            />
          )}

          {activeView === 'astra' && (
            <AstraView
              selectedSite={selectedSite}
              summary={selectedSummary}
              scenario={scenario}
              onOpenChat={() => setAstraOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Floating Context-Aware Astra Mission Assistant */}
      <AstraPanel
        isOpen={astraOpen}
        selectedSite={selectedSite}
        scenario={scenario}
        summary={selectedSummary}
        comparisonSites={comparisonSites}
        onToggle={() => setAstraOpen((prev) => !prev)}
        onClose={() => setAstraOpen(false)}
      />
    </div>
  );
};

export default App;
