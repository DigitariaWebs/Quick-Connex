"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";
import AdminLayout from "@/components/admin/layouts/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge";
import { Input } from "@/components/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/ui/table";
import { Alert, AlertDescription } from "@/components/shared/ui/alert";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  User,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface SessionData {
  _id: string;
  sessionId: string;
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: string;
  };
  deviceInfo: {
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    deviceType: string;
    platform: string;
  };
  ipAddress: string;
  location?: {
    country?: string;
    city?: string;
  };
  createdAt: string;
  lastAccessedAt: string;
  expiresAt: string;
  isActive: boolean;
  revoked: boolean;
  sessionType: string;
  securityContext: {
    riskScore: number;
    riskLevel: "low" | "medium" | "high";
    isNewDevice: boolean;
    isNewLocation: boolean;
    suspiciousActivity: boolean;
    securityFlags: string[];
  };
  sessionAge: number;
  remainingTime: number;
  isExpired: boolean;
}

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  revokedSessions: number;
  highRiskSessions: number;
}

export default function AdminSessionsPage() {
  const { user } = useSession();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    riskLevel: "all",
    search: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Load sessions
  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status !== "all" && { status: filters.status }),
        ...(filters.riskLevel !== "all" && { riskLevel: filters.riskLevel }),
      });

      const response = await fetch(`/api/admin/sessions?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
        setStats(data.stats);
        setPagination(data.pagination);
      } else {
        setError("Failed to load sessions");
      }
    } catch (err) {
      setError("Failed to load sessions");
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Revoke session
  const revokeSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to revoke this session?")) return;

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}/revoke`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        await loadSessions(); // Reload sessions
      } else {
        alert("Failed to revoke session");
      }
    } catch (err) {
      alert("Failed to revoke session");
      console.error("Failed to revoke session:", err);
    }
  };

  // Cleanup sessions
  const cleanupSessions = async () => {
    if (
      !confirm(
        "Are you sure you want to cleanup expired and suspicious sessions?"
      )
    )
      return;

    try {
      const response = await fetch("/api/admin/sessions/cleanup", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        await loadSessions(); // Reload sessions
        alert("Session cleanup completed successfully");
      } else {
        alert("Failed to cleanup sessions");
      }
    } catch (err) {
      alert("Failed to cleanup sessions");
      console.error("Failed to cleanup sessions:", err);
    }
  };

  // Load sessions on mount and when filters change
  useEffect(() => {
    loadSessions();
  }, [filters, pagination.page]);

  // Get device icon
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  // Get risk badge
  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            High Risk
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Medium Risk
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Low Risk
          </Badge>
        );
    }
  };

  // Get status badge
  const getStatusBadge = (session: SessionData) => {
    if (session.revoked) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Revoked
        </Badge>
      );
    }
    if (session.isExpired) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  // Format time
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <AdminLayout
      pageTitle="Session Management"
      pageDescription="Monitor and manage user sessions across the platform"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sessions
                </CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSessions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Sessions
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.activeSessions}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Expired Sessions
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.expiredSessions}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Revoked Sessions
                </CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats.revokedSessions}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  High Risk Sessions
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.highRiskSessions}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Session Management</CardTitle>
            <CardDescription>
              Monitor and manage user sessions. Filter by status, risk level, or
              search for specific sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Search sessions..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                />
              </div>

              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.riskLevel}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, riskLevel: value }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={cleanupSessions} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Cleanup Sessions
              </Button>
            </div>

            {/* Sessions Table */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Session Age</TableHead>
                      <TableHead>Last Access</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {session.user.firstName} {session.user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {session.user.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {session.user.userType}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(session.deviceInfo.deviceType)}
                            <div>
                              <div className="text-sm font-medium">
                                {session.deviceInfo.browser}{" "}
                                {session.deviceInfo.browserVersion}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {session.deviceInfo.os}{" "}
                                {session.deviceInfo.osVersion}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <div className="text-sm">
                              {session.location?.city &&
                              session.location?.country
                                ? `${session.location.city}, ${session.location.country}`
                                : session.ipAddress}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>{getStatusBadge(session)}</TableCell>

                        <TableCell>
                          {getRiskBadge(session.securityContext.riskLevel)}
                          {session.securityContext.securityFlags.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {session.securityContext.securityFlags.join(", ")}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            {formatTime(session.sessionAge)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            {new Date(session.lastAccessedAt).toLocaleString()}
                          </div>
                        </TableCell>

                        <TableCell>
                          {session.isActive &&
                            !session.revoked &&
                            !session.isExpired && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => revokeSession(session.sessionId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} sessions
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    disabled={pagination.page === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
