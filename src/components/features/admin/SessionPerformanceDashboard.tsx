"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Database,
  Zap,
  Shield,
  Clock,
  TrendingUp,
} from "lucide-react";

interface SessionPoolStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  highRiskSessions: number;
  averageSessionAge: number;
  sessionDistribution: Record<string, number>;
  performanceMetrics: {
    averageQueryTime: number;
    cacheHitRate: number;
    connectionPoolSize: number;
    memoryUsage: number;
  };
}

interface PerformanceAnalytics {
  averageQueryTime: number;
  cacheHitRate: number;
  totalQueries: number;
  slowQueries: number;
  cacheSize: number;
  memoryUsage: number;
  queryDistribution: Record<string, number>;
}

interface PerformanceData {
  sessionPool: SessionPoolStats;
  performance: PerformanceAnalytics;
  cleanup: {
    sessionsCleaned: number;
    cleanupTime: number;
    efficiency: number;
  };
  recommendations: string[];
}

export function SessionPerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/session-performance", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch performance data");
      }

      const result = await response.json();

      if (result.success) {
        setData(result);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.error || "Failed to get performance data");
      }
    } catch (err) {
      console.error("Performance data fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPerformanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading performance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            Error loading performance data: {error}
          </p>
          <Button onClick={fetchPerformanceData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { sessionPool, performance, cleanup, recommendations } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Session Performance Dashboard</h2>
          <p className="text-gray-600">
            Real-time monitoring of session system performance
            {lastUpdated && (
              <span className="ml-2 text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <Button onClick={fetchPerformanceData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sessions
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessionPool.activeSessions}
            </div>
            <p className="text-xs text-muted-foreground">
              of {sessionPool.totalSessions} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Hit Rate
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance.cacheHitRate}%
            </div>
            <Progress value={performance.cacheHitRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Query Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance.averageQueryTime}ms
            </div>
            <p className="text-xs text-muted-foreground">
              {performance.slowQueries} slow queries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance.memoryUsage}MB
            </div>
            <p className="text-xs text-muted-foreground">
              Cache size: {performance.cacheSize}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Session Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Session Distribution</CardTitle>
          <CardDescription>Active sessions by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(sessionPool.sessionDistribution).map(
              ([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{type}</Badge>
                    <span className="text-sm text-gray-600">
                      {count} sessions
                    </span>
                  </div>
                  <div className="w-32">
                    <Progress
                      value={(count / sessionPool.activeSessions) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Security Metrics
          </CardTitle>
          <CardDescription>Session security and risk analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {sessionPool.highRiskSessions}
              </div>
              <p className="text-sm text-gray-600">High Risk Sessions</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {sessionPool.expiredSessions}
              </div>
              <p className="text-sm text-gray-600">Expired Sessions</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {sessionPool.averageSessionAge}
              </div>
              <p className="text-sm text-gray-600">Avg Session Age (min)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Cleanup Performance</CardTitle>
          <CardDescription>Session cleanup efficiency metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {cleanup.sessionsCleaned}
              </div>
              <p className="text-sm text-gray-600">Sessions Cleaned</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{cleanup.cleanupTime}ms</div>
              <p className="text-sm text-gray-600">Cleanup Time</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{cleanup.efficiency}</div>
              <p className="text-sm text-gray-600">Sessions/sec</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
          <CardDescription>System optimization suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
