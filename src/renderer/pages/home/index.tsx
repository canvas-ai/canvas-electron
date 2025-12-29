import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import { API_ROUTES } from '@/config/api';

// Interface for the actual user data within the payload
interface UserData {
  id: string;
  name: string;
  email: string;
  userType: string;
  status: string;
  createdAt?: string; // Added for consistency with global User type
  updatedAt?: string; // Added for consistency with global User type
  // Allow any other string properties that might come from the API payload
  [key: string]: any;
}

// Interface for the full API response from /auth/me
interface AuthMeApiResponse {
  status: string;
  statusCode: number;
  message: string;
  payload: UserData;
}

interface HomePageLocationState {
  message?: string;
}

export default function HomePage() {
  const location = useLocation();
  const [user, setUser] = useState<UserData | null>(null); // User state now holds UserData
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const typedState = location.state as HomePageLocationState | null;
  const successMessage = typedState?.message;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        // Fetch the full API response structure
        const response = await api.get<AuthMeApiResponse>(API_ROUTES.me);
        setUser(response.payload); // Set the user state with the payload content
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch user information';
        setError(message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const integrationLinks = [
    { name: 'Browser extensions', url: 'https://github.com/canvas-ai/canvas-browser-extensions', description: 'Integrate Canvas directly into your web browser.' },
    { name: 'CLI Client', url: 'https://github.com/canvas-ai/canvas-cli', description: 'Manage Canvas from your command line.' },
    { name: 'Shell client', url: 'https://github.com/canvas-ai/canvas-shell', description: 'Interact with Canvas using a shell interface.' },
    { name: 'Electron UI', url: 'https://github.com/canvas-ai/canvas-electron', description: 'Use the Canvas desktop application.' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b pb-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {successMessage ? successMessage : "Control Center"}
        </h1>
        {!successMessage && <p className="text-muted-foreground mt-2">&#8734;</p>}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content - left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Integrations Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Integrate Canvas into your workflows</h2>
            <p className="text-muted-foreground">
              Enhance your productivity by connecting Canvas with your favorite tools.
            </p>
            <ul className="space-y-4">
              {integrationLinks.map((link) => (
                <li key={link.name} className="border p-4 rounded-md hover:shadow-md transition-shadow">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline text-lg"
                  >
                    {link.name}
                  </a>
                  <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation Link */}
          <div className="text-center pt-4">
            <Link to="/workspaces" className="text-primary hover:underline">
              Go to your Workspaces &rarr;
            </Link>
          </div>
        </div>

        {/* User Information - right column */}
        <div className="space-y-4">
          {loading && <p className="text-center text-muted-foreground">Loading user information...</p>}
          {error && <p className="text-center text-destructive">Error: {error}</p>}

          {user && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">User Information</h2>
              <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                {Object.entries(user).map(([key, value]) => {
                  if (typeof value === 'string' || typeof value === 'number') {
                    return (
                      <p key={key} className="text-sm">
                        <strong className="capitalize text-foreground">{key.replace(/([A-Z])/g, ' $1')}:</strong>
                        <span className="ml-2 text-muted-foreground">{value.toString()}</span>
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
