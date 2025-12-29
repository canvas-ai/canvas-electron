import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/toast-container';
import {
  getWorkspaceServicesStatus,
  enableWorkspaceService,
  disableWorkspaceService,
  WorkspaceServicesStatus
} from '@/services/workspace';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface ServicesPanelProps {
  workspaceId: string;
}

export function ServicesPanel({ workspaceId }: ServicesPanelProps) {
  const [services, setServices] = useState<WorkspaceServicesStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchServices = useCallback(async () => {
    try {
      const status = await getWorkspaceServicesStatus(workspaceId);
      setServices(status);
    } catch (err) {
      console.error('Failed to fetch services status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleToggleService = async (serviceName: 'dotfiles' | 'home', currentlyEnabled: boolean) => {
    setToggling(serviceName);
    try {
      if (currentlyEnabled) {
        await disableWorkspaceService(workspaceId, serviceName);
        showToast({
          title: 'Service Disabled',
          description: `${serviceName} service has been disabled`,
        });
      } else {
        await enableWorkspaceService(workspaceId, serviceName);
        showToast({
          title: 'Service Enabled',
          description: `${serviceName} service has been enabled`,
        });
      }
      await fetchServices();
    } catch (err) {
      showToast({
        title: 'Error',
        description: `Failed to toggle ${serviceName} service`,
        variant: 'destructive',
      });
    } finally {
      setToggling(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading services...
      </div>
    );
  }

  if (!services) {
    return null;
  }

  const serviceItems = [
    {
      id: 'dotfiles',
      name: 'Dotfiles',
      description: 'Git-based dotfile sync',
      status: services.dotfiles,
    },
    {
      id: 'home',
      name: 'Home',
      description: 'WebDAV file storage',
      status: services.home,
    },
  ] as const;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Workspace Services</h4>

      {serviceItems.map((service) => {
        const isEnabled = service.status.enabled;
        const isToggling = toggling === service.id;

        return (
          <div
            key={service.id}
            className="flex items-center justify-between py-2"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{service.name}</span>
                {service.status.initialized ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{service.description}</p>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => handleToggleService(service.id, isEnabled)}
              disabled={isToggling}
              className={`
                relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full
                border-2 border-transparent transition-colors duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                disabled:cursor-not-allowed disabled:opacity-50
                ${isEnabled ? 'bg-primary' : 'bg-muted'}
              `}
              role="switch"
              aria-checked={isEnabled}
            >
              {isToggling ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" />
                </span>
              ) : (
                <span
                  className={`
                    pointer-events-none inline-block h-4 w-4 transform rounded-full
                    bg-background shadow ring-0 transition duration-200 ease-in-out
                    ${isEnabled ? 'translate-x-4' : 'translate-x-0'}
                  `}
                />
              )}
            </button>
          </div>
        );
      })}

      {services.home.transports && services.home.enabled && (
        <p className="text-xs text-muted-foreground pt-1 border-t">
          Transports: {services.home.transports.join(', ')}
        </p>
      )}
    </div>
  );
}
