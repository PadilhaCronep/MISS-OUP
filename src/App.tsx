import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext.tsx';
import { Layout } from './components/Layout.tsx';
import { ScrollToTop } from './components/layout/ScrollToTop.tsx';

const Onboarding = lazy(() => import('./pages/Onboarding.tsx').then((m) => ({ default: m.Onboarding })));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx').then((m) => ({ default: m.Dashboard })));
const MapPage = lazy(() => import('./pages/Map.tsx').then((m) => ({ default: m.MapPage })));
const BadgesPage = lazy(() => import('./pages/Badges.tsx').then((m) => ({ default: m.BadgesPage })));
const AdminAccess = lazy(() => import('./pages/AdminAccess.tsx').then((m) => ({ default: m.AdminAccess })));
const EngajamentoHub = lazy(() => import('./pages/EngajamentoHub.tsx').then((m) => ({ default: m.EngajamentoHub })));
const GuiaInicial = lazy(() => import('./pages/GuiaInicial.tsx').then((m) => ({ default: m.GuiaInicial })));

const TrainingHub = lazy(() => import('./pages/voluntario/formacao/Hub.tsx').then((m) => ({ default: m.TrainingHub })));
const TrackDetails = lazy(() => import('./pages/voluntario/formacao/TrackDetails.tsx').then((m) => ({ default: m.TrackDetails })));
const ModulePlayer = lazy(() => import('./pages/voluntario/formacao/ModulePlayer.tsx').then((m) => ({ default: m.ModulePlayer })));
const Certificates = lazy(() => import('./pages/voluntario/formacao/Certificates.tsx').then((m) => ({ default: m.Certificates })));
const MinhaFuncao = lazy(() => import('./pages/voluntario/MinhaFuncao.tsx').then((m) => ({ default: m.MinhaFuncao })));
const CampaignHub = lazy(() => import('./pages/voluntario/CampaignHub.tsx').then((m) => ({ default: m.CampaignHub })));

const CoordinatorLayout = lazy(() => import('./pages/coordinator/CoordinatorLayout.tsx').then((m) => ({ default: m.CoordinatorLayout })));
const CoordinatorDashboard = lazy(() => import('./pages/coordinator/Dashboard.tsx').then((m) => ({ default: m.CoordinatorDashboard })));
const VolunteersList = lazy(() => import('./pages/coordinator/VolunteersList.tsx').then((m) => ({ default: m.VolunteersList })));
const VolunteerProfile = lazy(() => import('./pages/coordinator/VolunteerProfile.tsx').then((m) => ({ default: m.VolunteerProfile })));
const MissionsManagement = lazy(() => import('./pages/coordinator/MissionsManagement.tsx').then((m) => ({ default: m.MissionsManagement })));
const Territories = lazy(() => import('./pages/coordinator/Territories.tsx').then((m) => ({ default: m.Territories })));
const Reports = lazy(() => import('./pages/coordinator/Reports.tsx').then((m) => ({ default: m.Reports })));
const CampaignsList = lazy(() => import('./pages/coordinator/CampaignsList.tsx').then((m) => ({ default: m.CampaignsList })));
const NewCampaign = lazy(() => import('./pages/coordinator/NewCampaign.tsx').then((m) => ({ default: m.NewCampaign })));
const CampaignDetails = lazy(() => import('./pages/coordinator/CampaignDetails.tsx').then((m) => ({ default: m.CampaignDetails })));
const SectorHR = lazy(() => import('./pages/coordinator/SectorHR.tsx').then((m) => ({ default: m.SectorHR })));
const InteligenciaHub = lazy(() => import('./pages/coordinator/InteligenciaHub.tsx').then((m) => ({ default: m.InteligenciaHub })));

const NotFound = lazy(() => import('./pages/NotFound.tsx').then((m) => ({ default: m.NotFound })));

const RouteFallback: React.FC = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-zinc-500">Carregando pagina...</div>
);

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/onboarding" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
};

export default function App() {
  const coordinatorRoles = ['COORDENADOR_MUNICIPAL', 'COORDENADOR_ESTADUAL', 'ADMIN', 'ADMIN_NACIONAL', 'ADMIN_ESTADUAL', 'ADMIN_REGIONAL', 'PRE_CANDIDATO', 'CHEFE_CAMPANHA', 'COORDENADOR_CAMPANHA', 'LIDER_SETOR'];

  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Layout>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/acesso-admin" element={<AdminAccess />} />
              <Route path="/" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/engajamento" element={<ProtectedRoute><EngajamentoHub /></ProtectedRoute>} />
              <Route path="/guia-inicial" element={<ProtectedRoute><GuiaInicial /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
              <Route path="/badges" element={<ProtectedRoute><BadgesPage /></ProtectedRoute>} />

              <Route path="/voluntario/formacao" element={<ProtectedRoute><TrainingHub /></ProtectedRoute>} />
              <Route path="/voluntario/formacao/trilha/:trilhaId" element={<ProtectedRoute><TrackDetails /></ProtectedRoute>} />
              <Route
                path="/voluntario/formacao/trilha/:trilhaId/modulo/:moduloId"
                element={<ProtectedRoute><ModulePlayer /></ProtectedRoute>}
              />
              <Route path="/voluntario/formacao/certificados" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
              <Route path="/voluntario/funcao" element={<ProtectedRoute><MinhaFuncao /></ProtectedRoute>} />
              <Route path="/voluntario/campanhas" element={<ProtectedRoute><CampaignHub /></ProtectedRoute>} />
              <Route path="/campaign/:id" element={<ProtectedRoute><CampaignDetails /></ProtectedRoute>} />

              <Route
                path="/coordinator"
                element={
                  <ProtectedRoute roles={coordinatorRoles}>
                    <CoordinatorLayout>
                      <CoordinatorDashboard />
                    </CoordinatorLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/volunteers"
                element={
                  <ProtectedRoute roles={coordinatorRoles}>
                    <CoordinatorLayout>
                      <VolunteersList />
                    </CoordinatorLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/volunteers/:id"
                element={
                  <ProtectedRoute roles={coordinatorRoles}>
                    <CoordinatorLayout>
                      <VolunteerProfile />
                    </CoordinatorLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/missions"
                element={
                  <ProtectedRoute roles={coordinatorRoles}>
                    <CoordinatorLayout>
                      <MissionsManagement />
                    </CoordinatorLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/territories"
                element={
                  <ProtectedRoute roles={coordinatorRoles}>
                    <CoordinatorLayout>
                      <Territories />
                    </CoordinatorLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/reports"
                element={
                  <ProtectedRoute roles={coordinatorRoles}>
                    <CoordinatorLayout>
                      <Reports />
                    </CoordinatorLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/campaigns"
                element={
                  <ProtectedRoute roles={coordinatorRoles}>
                    <CoordinatorLayout>
                      <CampaignsList />
                    </CoordinatorLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/campaigns/new"
                element={
                  <ProtectedRoute roles={coordinatorRoles}>
                    <CoordinatorLayout>
                      <NewCampaign />
                    </CoordinatorLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/campaign/:id"
                element={
                  <ProtectedRoute roles={coordinatorRoles}>
                    <CoordinatorLayout>
                      <CampaignDetails />
                    </CoordinatorLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/campaign/:campaignId/sector/:sectorSlug/rh"
                element={
                  <ProtectedRoute roles={coordinatorRoles}>
                    <CoordinatorLayout>
                      <SectorHR />
                    </CoordinatorLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/inteligencia"
                element={
                  <ProtectedRoute roles={coordinatorRoles}>
                    <CoordinatorLayout>
                      <InteligenciaHub />
                    </CoordinatorLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/coordenador/inteligencia" element={<Navigate to="/coordinator/inteligencia" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

