import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { View, Scenario } from '@/types';
import { sites, getSite } from '@/data/sites';
import { DEFAULT_SCENARIO, getSummary } from '@/lib/scenarioCalculations';
import { ensureEphemeris, type AstraAppState, type HorizonMode } from '@/astra/runtime';
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
import { TripView } from '@/views/TripView';
import SiteTerrainView from '@/components/sites/SiteTerrainView';
import { TripSimulationOverlay } from '@/components/trip/TripSimulationOverlay';
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
  const [tripOpen, setTripOpen] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<'charts' | 'terrain'>('charts');
  // State Astra reads (previously local to individual views).
  const [horizonMode, setHorizonMode] = useState<HorizonMode>('reference');
  const [terrainHour, setTerrainHour] = useState(12);
  const [ephemerisRevision, setEphemerisRevision] = useState(0);

  // Load the NASA 2026 table on the main thread so the globe, terrain renderer
  // and Astra use it instead of the approximate analytic fallback.
  useEffect(() => {
    ensureEphemeris().then((ok) => { if (ok) setEphemerisRevision((r) => r + 1); }).catch(() => {});
  }, []);

  const selectedSite = getSite(selectedSiteId);
  const selectedSummary = useMemo(
    () => getSummary(selectedSite, scenario),
    [selectedSite, scenario]
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

  const handleStartTrip = () => setTripOpen(true);
  const handleExitTrip = () => {
    setTripOpen(false);
    setActiveView('overview');
  };

  const astraState: AstraAppState = useMemo(() => ({
    activeView, selectedSiteId, compareIds, scenario, horizonMode, analysisTab, terrainHour,
  }), [activeView, selectedSiteId, compareIds, scenario, horizonMode, analysisTab, terrainHour]);

  const openAstra = useCallback(() => setAstraOpen(true), []);

  return (
    <div className="app-shell">
      <CustomCursor hidden={tripOpen} />
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
              ephemerisRevision={ephemerisRevision}
              selectedSiteId={selectedSiteId}
              onSelectSite={setSelectedSiteId}
              onOpenSite={handleVisitTerrain}
              onNavigate={handleNavigate}
            />
          )}

          {activeView === 'globe' && (
            <GlobeView
              scenario={scenario}
              ephemerisRevision={ephemerisRevision}
              selectedSiteId={selectedSiteId}
              onSelectSite={setSelectedSiteId}
              onOpenSite={handleOpenSite}
            />
          )}

          {activeView === 'trip' && <TripView onStart={handleStartTrip} />}

          {activeView === 'terrain' && (
            <div className="view-stack">
              <div style={{ width: '100%', minHeight: 'calc(100vh - 120px)' }}>
                <SiteTerrainView
                    site={selectedSite}
                    date={scenario.date}
                    onSelectSite={setSelectedSiteId}
                    hour={terrainHour}
                    onHourChange={setTerrainHour}
                    ephemerisRevision={ephemerisRevision}
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
              onTabChange={setAnalysisTab}
              terrainHour={terrainHour}
              onTerrainHourChange={setTerrainHour}
              ephemerisRevision={ephemerisRevision}
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
              horizonMode={horizonMode}
              onHorizonModeChange={setHorizonMode}
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
        state={astraState}
        onToggle={() => setAstraOpen((prev) => !prev)}
        onOpen={openAstra}
        onClose={() => setAstraOpen(false)}
        onNavigate={handleNavigate}
        onSelectSite={setSelectedSiteId}
        onSetCompare={(ids) => setCompareIds(ids.filter((id, i, a) => a.indexOf(id) === i).slice(0, 6))}
        onApplyScenario={(changes) => setScenario((current) => ({ ...current, ...changes }))}
        onSetTerrainHour={setTerrainHour}
      />
      {/* Full-screen Lunar Polar Explorer simulation launched from TripView */}
      {tripOpen && <TripSimulationOverlay onExit={handleExitTrip} />}
    </div>
  );
};

export default App;
