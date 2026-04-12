import { useEffect, useMemo, useState } from 'react';
import { AuthPanel, type AuthFormData } from '../../../../../packages/ui/src/components/auth/AuthPanel';
import { ParticlePanel } from '../../../../../packages/ui/src/components/auth/ParticlePanel';
import { Button } from '../../../../../packages/ui/src/components/ui/button';
import { Input } from '../../../../../packages/ui/src/components/ui/input';

type WizardStage = 'server' | 'client' | 'complete';

type RemoteAuth = {
  serverUrl: string;
  token: string;
  email?: string;
  mode: 'password' | 'token';
};

type ServerDevice = {
  id?: string;
  deviceId?: string;
  name?: string;
  description?: string;
  hostname?: string;
  fqdn?: string;
};

type SetupRemote = {
  id: string;
  serverUrl: string;
  serverFqdn: string;
  user: string;
  email?: string;
  auth: {
    type: 'password' | 'token';
    token: string;
  };
  selectedDeviceId?: string;
  deviceToken?: string;
  createdAt: string;
  updatedAt: string;
};

type SetupDeviceConfig = {
  machineId: string;
  name: string;
  description?: string;
  remotes: Record<string, {
    deviceId: string;
    deviceToken?: string;
    updatedAt: string;
  }>;
};

type SetupWizardProps = {
  onComplete: () => Promise<void> | void;
};

function normalizeServerUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/g, '');
  if (trimmed.endsWith('/rest/v2')) return trimmed.slice(0, -'/rest/v2'.length);
  return trimmed;
}

function toApiUrl(serverUrl: string): string {
  return `${normalizeServerUrl(serverUrl)}/rest/v2`;
}

function parseListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const typed = payload as { payload?: unknown; devices?: unknown; workspaces?: unknown };
    if (Array.isArray(typed.payload)) return typed.payload;
    if (Array.isArray(typed.devices)) return typed.devices;
    if (Array.isArray(typed.workspaces)) return typed.workspaces;
  }
  return [];
}

function extractUser(payload: any, fallbackEmail?: string): { user: string; email?: string } {
  const source = payload?.payload || payload?.user || payload;
  const email = String(source?.email || fallbackEmail || '').trim() || undefined;
  const rawUser = String(
    source?.username ||
    source?.user ||
    source?.name ||
    (email ? email.split('@')[0] : '') ||
    source?.id ||
    'user',
  ).trim();
  return {
    user: rawUser || 'user',
    email,
  };
}

function getServerDeviceId(device: ServerDevice): string {
  return String(device.deviceId || device.id || '').trim();
}

function getServerDeviceName(device: ServerDevice): string {
  return String(device.name || device.hostname || device.fqdn || getServerDeviceId(device) || '').trim();
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [stage, setStage] = useState<WizardStage>('server');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [remotes, setRemotes] = useState<SetupRemote[]>([]);
  const [deviceConfig, setDeviceConfig] = useState<SetupDeviceConfig | null>(null);
  const [currentRemote, setCurrentRemote] = useState<SetupRemote | null>(null);
  const [currentAuth, setCurrentAuth] = useState<RemoteAuth | null>(null);
  const [fetchedDevices, setFetchedDevices] = useState<ServerDevice[]>([]);
  const [fetchedWorkspaces, setFetchedWorkspaces] = useState<unknown[]>([]);
  const [deviceMode, setDeviceMode] = useState<'register' | 'existing'>('register');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientDescription, setClientDescription] = useState('');

  useEffect(() => {
    const load = async () => {
      const [savedRemotes, savedDevice] = await Promise.all([
        window.canvas?.getSetupRemotes?.() ?? Promise.resolve([]),
        window.canvas?.getSetupDevice?.() ?? Promise.resolve(null),
      ]);
      setRemotes(savedRemotes);
      setDeviceConfig(savedDevice);
      setClientName(savedDevice?.name || '');
      setClientDescription(savedDevice?.description || '');
      setBootstrapped(true);
    };
    load();
  }, []);

  const connectedRemoteCount = remotes.length;
  const machineId = deviceConfig?.machineId || '';

  const currentBinding = useMemo(() => {
    if (!deviceConfig || !currentRemote) return null;
    return deviceConfig.remotes[currentRemote.id] ?? null;
  }, [currentRemote, deviceConfig]);

  const selectedServerDevice = useMemo(() => {
    if (!selectedDeviceId) return null;
    return fetchedDevices.find((device) => getServerDeviceId(device) === selectedDeviceId) ?? null;
  }, [fetchedDevices, selectedDeviceId]);

  const existingDeviceSelected = deviceMode === 'existing' && !!selectedServerDevice;
  const displayedDeviceId = existingDeviceSelected ? getServerDeviceId(selectedServerDevice) : machineId;
  const displayedDeviceLabel = existingDeviceSelected ? 'Associated remote device ID' : 'Machine ID';

  useEffect(() => {
    if (deviceMode !== 'existing' || !selectedServerDevice) return;
    setClientName(getServerDeviceName(selectedServerDevice));
    setClientDescription(selectedServerDevice.description || '');
  }, [deviceMode, selectedServerDevice]);

  const testConnection = async (data: AuthFormData) => {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const apiUrl = toApiUrl(data.serverUrl);
      const response = await fetch(`${apiUrl}/auth/config`, { method: 'GET' });
      if (!response.ok) throw new Error(`Server replied ${response.status}`);
      setStatus('Connection looks good.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed.');
    } finally {
      setBusy(false);
    }
  };

  const login = async (data: AuthFormData) => {
    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const baseUrl = normalizeServerUrl(data.serverUrl);
      const apiUrl = toApiUrl(baseUrl);

      let token = '';
      if (data.mode === 'token') {
        token = data.token?.trim() ?? '';
        if (!token) throw new Error('Token is required.');
      } else {
        if (!data.email || !data.password) throw new Error('Email and password are required.');
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, password: data.password, strategy: 'auto' }),
        });
        const payload = await response.json();
        token = payload?.token || payload?.payload?.token || '';
        if (!response.ok || !token) {
          throw new Error(payload?.message || 'Login failed.');
        }
      }

      setStatus('Fetching account details...');
      const meResponse = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-App-Name': 'canvas-electron',
        },
      });
      const mePayload = await meResponse.json();
      if (!meResponse.ok) {
        throw new Error(mePayload?.message || 'Failed to load account details.');
      }
      const identity = extractUser(mePayload, data.email);

      setStatus(`Fetching canvas server devices for user ${identity.user}...`);
      const devicesResponse = await fetch(`${apiUrl}/auth/devices`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-App-Name': 'canvas-electron',
        },
      });
      const devicesPayload = await devicesResponse.json();
      if (!devicesResponse.ok) {
        throw new Error(devicesPayload?.message || 'Failed to load devices.');
      }
      const devices = parseListPayload(devicesPayload) as ServerDevice[];

      setStatus(`Fetching canvas workspaces for user ${identity.user}...`);
      const workspacesResponse = await fetch(`${apiUrl}/workspaces`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-App-Name': 'canvas-electron',
        },
      });
      const workspacesPayload = await workspacesResponse.json();
      if (!workspacesResponse.ok) {
        throw new Error(workspacesPayload?.message || 'Failed to load workspaces.');
      }
      const workspaces = parseListPayload(workspacesPayload);

      const remote = await window.canvas?.saveSetupRemote?.({
        serverUrl: baseUrl,
        user: identity.user,
        email: identity.email,
        auth: { type: data.mode, token },
        devices,
        workspaces,
        makeActive: true,
      });
      if (!remote) throw new Error('Failed to store remote.');

      const nextRemotes = [
        ...remotes.filter((entry) => entry.id !== remote.id),
        remote,
      ];
      setRemotes(nextRemotes);
      setCurrentRemote(remote);
      setCurrentAuth({
        serverUrl: baseUrl,
        token,
        email: identity.email,
        mode: data.mode,
      });
      setFetchedDevices(devices);
      setFetchedWorkspaces(workspaces);

      const existingBinding = deviceConfig?.remotes?.[remote.id];
      if (existingBinding?.deviceId) {
        setDeviceMode('existing');
        setSelectedDeviceId(existingBinding.deviceId);
      } else {
        setDeviceMode('register');
        setSelectedDeviceId('');
      }

      setStage('client');
      setStatus(`Connected to ${remote.serverFqdn}. ${devices.length} devices and ${workspaces.length} workspaces cached.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveClientSetup = async () => {
    if (!deviceConfig || !currentRemote || !currentAuth) return;
    if (!clientName.trim()) {
      setError('Machine name is required.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let nextDeviceId = selectedDeviceId;
      let nextDeviceToken: string | undefined;

      if (deviceMode === 'register') {
        setStatus('Registering this machine with the remote...');
        const response = await fetch(`${toApiUrl(currentAuth.serverUrl)}/auth/devices/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentAuth.token}`,
            'X-App-Name': 'canvas-electron',
          },
          body: JSON.stringify({
            deviceId: deviceConfig.machineId,
            name: clientName.trim(),
            description: clientDescription.trim() || undefined,
            hostname: clientName.trim(),
            platform: navigator.platform,
            type: 'desktop',
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || 'Failed to register device.');
        }

        const devicePayload = payload?.payload || payload;
        nextDeviceId = String(
          devicePayload?.deviceId ||
          devicePayload?.id ||
          devicePayload?.device?.deviceId ||
          devicePayload?.device?.id ||
          deviceConfig.machineId,
        );
        nextDeviceToken = devicePayload?.token || devicePayload?.deviceToken || devicePayload?.device?.token;
      } else if (!selectedDeviceId) {
        throw new Error('Pick an existing device or register a new one.');
      }

      const nextDevice = await window.canvas?.saveSetupDevice?.({
        remoteId: currentRemote.id,
        name: clientName.trim(),
        description: clientDescription.trim() || undefined,
        deviceId: nextDeviceId,
        deviceToken: nextDeviceToken,
      });
      if (!nextDevice) throw new Error('Failed to store device configuration.');

      const savedRemotes = await window.canvas?.getSetupRemotes?.();
      const savedDevice = await window.canvas?.getSetupDevice?.();

      setDeviceConfig(savedDevice ?? nextDevice);
      if (savedRemotes?.length) {
        setRemotes(savedRemotes);
        setCurrentRemote(savedRemotes.find((remote) => remote.id === currentRemote.id) ?? currentRemote);
      } else {
        setRemotes((current) => current.map((remote) => {
          if (remote.id !== currentRemote.id) return remote;
          return {
            ...remote,
            selectedDeviceId: nextDeviceId,
            deviceToken: nextDeviceToken ?? remote.deviceToken,
          };
        }));
        setCurrentRemote((current: SetupRemote | null) => current ? {
          ...current,
          selectedDeviceId: nextDeviceId,
          deviceToken: nextDeviceToken ?? current.deviceToken,
        } : current);
      }
      setStage('complete');
      setStatus('Remote and machine setup complete.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save client setup.');
    } finally {
      setBusy(false);
    }
  };

  const finishSetup = async () => {
    if (!currentRemote) return;
    setBusy(true);
    setError(null);
    try {
      await window.canvas?.completeSetup?.(currentRemote.id);
      await onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish setup.');
    } finally {
      setBusy(false);
    }
  };

  const addAnotherRemote = () => {
    setStage('server');
    setCurrentRemote(null);
    setCurrentAuth(null);
    setFetchedDevices([]);
    setFetchedWorkspaces([]);
    setSelectedDeviceId('');
    setError(null);
    setStatus(`Configured remotes: ${connectedRemoteCount}`);
  };

  if (!bootstrapped) {
    return <div className="h-screen w-screen overflow-hidden rounded-lg bg-black" />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden rounded-lg bg-background text-foreground shadow-elevation-4">
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[0.382fr_0.618fr]">
        <ParticlePanel />
        <div className="flex h-full w-full flex-col bg-white">
          <div className="border-b px-10 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-2xl font-semibold">Configure Canvas UI</div>
                <div className="text-sm text-muted-foreground">
                  Stage {stage === 'server' ? '1' : stage === 'client' ? '2' : '3'} of 3
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>{connectedRemoteCount} remote{connectedRemoteCount === 1 ? '' : 's'} configured</div>
                <div>Machine ID: <span className="font-mono">{machineId}</span></div>
              </div>
            </div>
          </div>

          {stage === 'server' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              <div className="border-b px-10 py-6">
                <div className="mb-4 text-sm font-medium">Server setup</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <button className="rounded-lg border border-border bg-muted/40 p-4 text-left">
                    <div className="font-medium">Connect to a Canvas server</div>
                    <div className="mt-1 text-sm text-muted-foreground">Use server URL with credentials or token.</div>
                  </button>
                  <button disabled className="rounded-lg border border-border bg-muted/40 p-4 text-left opacity-50">
                    <div className="font-medium">Run locally with Docker</div>
                    <div className="mt-1 text-sm text-muted-foreground">Coming later. Naturally.</div>
                  </button>
                  <button disabled className="rounded-lg border border-border bg-muted/40 p-4 text-left opacity-50">
                    <div className="font-medium">Run locally with pm2</div>
                    <div className="mt-1 text-sm text-muted-foreground">Also not today.</div>
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <AuthPanel
                  defaultServerUrl={currentRemote?.serverUrl}
                  defaultEmail={currentRemote?.email}
                  busy={busy}
                  error={error}
                  status={status}
                  title="Contextualize your unstructured Universe!"
                  subtitle="Connect a Canvas server to get this machine into shape."
                  onTestConnection={testConnection}
                  onLogin={login}
                />
              </div>
            </div>
          )}

          {stage === 'client' && currentRemote && (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto p-10">
              <div className="mb-6">
                <div className="text-xl font-semibold">Client setup</div>
                <div className="text-sm text-muted-foreground">
                  Connected to <span className="font-mono">{currentRemote.serverFqdn}</span>. Pick how this machine should appear.
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{displayedDeviceLabel}</label>
                    <Input value={displayedDeviceId} readOnly className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Machine name</label>
                    <Input
                      value={clientName}
                      onChange={(event) => setClientName(event.target.value)}
                      placeholder="my-laptop"
                      disabled={existingDeviceSelected}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Machine description</label>
                    <Input
                      value={clientDescription}
                      onChange={(event) => setClientDescription(event.target.value)}
                      placeholder="optional"
                      disabled={existingDeviceSelected}
                    />
                  </div>
                  {existingDeviceSelected && (
                    <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      This device is managed by the selected remote entry. Rename it later in device settings if needed.
                    </div>
                  )}
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                  <div className="text-sm font-medium">Remote device binding</div>
                  <div
                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
                    onClick={() => setDeviceMode('register')}
                  >
                    <input
                      type="radio"
                      name="device-mode"
                      className="mt-1"
                      checked={deviceMode === 'register'}
                      onChange={() => setDeviceMode('register')}
                    />
                    <div>
                      <div className="font-medium">Register or update this machine</div>
                      <div className="text-sm text-muted-foreground">Uses the generated machine ID and stores the returned device token.</div>
                    </div>
                  </div>
                  <div
                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
                    onClick={() => setDeviceMode('existing')}
                  >
                    <input
                      type="radio"
                      name="device-mode"
                      className="mt-1"
                      checked={deviceMode === 'existing'}
                      onChange={() => setDeviceMode('existing')}
                    />
                    <div className="flex-1">
                      <div className="font-medium">Associate with an existing remote device</div>
                      <div className="mb-3 text-sm text-muted-foreground">Useful if this machine is already known by another Canvas app.</div>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={selectedDeviceId}
                        disabled={deviceMode !== 'existing'}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          const nextDeviceId = event.target.value;
                          setSelectedDeviceId(nextDeviceId);
                          const nextDevice = fetchedDevices.find((device) => getServerDeviceId(device) === nextDeviceId);
                          if (!nextDevice) return;
                          setClientName(getServerDeviceName(nextDevice));
                          setClientDescription(nextDevice.description || '');
                        }}
                      >
                        <option value="">Select existing device</option>
                        {fetchedDevices.map((device, index) => {
                          const deviceId = getServerDeviceId(device);
                          const label = getServerDeviceName(device) || `device-${index + 1}`;
                          return (
                            <option key={deviceId || index} value={deviceId}>
                              {label}{deviceId ? ` (${deviceId})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                    <div>{fetchedDevices.length} remote device{fetchedDevices.length === 1 ? '' : 's'} fetched</div>
                    <div>{fetchedWorkspaces.length} workspace{fetchedWorkspaces.length === 1 ? '' : 's'} cached</div>
                    {currentBinding?.deviceId && <div>Current binding: <span className="font-mono">{currentBinding.deviceId}</span></div>}
                  </div>
                </div>
              </div>

              {status && (
                <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {status}
                </div>
              )}
              {error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setStage('server')}>
                  Back
                </Button>
                <Button type="button" disabled={busy || !clientName.trim()} onClick={saveClientSetup}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {stage === 'complete' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto p-10">
              <div className="mb-6">
                <div className="text-xl font-semibold">Setup complete</div>
                <div className="text-sm text-muted-foreground">
                  You can finish now or add another remote before dropping into the normal launcher.
                </div>
              </div>

              <div className="space-y-3">
                {remotes.map((remote) => (
                  <div key={remote.id} className="rounded-lg border p-4">
                    <div className="font-medium">{remote.user}@{remote.serverFqdn}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{remote.serverUrl}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Device: <span className="font-mono">{deviceConfig?.remotes?.[remote.id]?.deviceId || remote.selectedDeviceId || 'not linked'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {status && (
                <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {status}
                </div>
              )}
              {error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button type="button" variant="outline" disabled={busy} onClick={addAnotherRemote}>
                  Add additional remote
                </Button>
                <Button type="button" disabled={busy || !remotes.length} onClick={finishSetup}>
                  Complete setup
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
