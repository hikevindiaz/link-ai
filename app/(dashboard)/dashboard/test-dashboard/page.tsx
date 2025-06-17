'use client';

import { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AreaChart, BarChart, Card as TremorCard, DonutChart, List, ListItem, Title, Text, Flex, Grid, Col, Badge, Metric, ProgressBar } from "@tremor/react";
import { Filter, Plus, Settings, RefreshCw, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

// Interfaces for data typing
interface StatsData {
  totalAgents: number;
  totalFiles: number;
  totalMessages: number;
  totalKnowledgeSources: number;
  totalForms: number;
  activeUsers: number;
  messageCountLast30Days: number;
  percentChange: {
    agents: number;
    files: number;
    messages: number;
    knowledgeSources: number;
    forms: number;
    activeUsers: number;
  }
}

interface MessageData {
  date: string;
  Messages: number;
}

interface UserInquiry {
  id: string;
  name: string;
  initial: string;
  textColor: string;
  bgColor: string;
  email: string;
  inquiry: string;
  time: string;
  status: 'pending' | 'resolved' | 'in-progress';
}

interface ChatbotError {
  id: string;
  chatbotName: string;
  chatbotId: string;
  threadId: string;
  errorMessage: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
}

interface ChatbotActivity {
  id: string;
  name: string;
  messagesLast7Days: number;
  messagesLast30Days: number;
  averageResponseTime: number;
  status: 'active' | 'inactive' | 'training';
  lastActive: string;
  errorRate: number;
}

interface KnowledgeSourceStats {
  id: string;
  name: string;
  type: 'file' | 'website' | 'qa' | 'text' | 'catalog';
  documentCount: number;
  usedBy: number;
  lastUpdated: string;
  size: number;
}

interface DashboardData {
  stats: StatsData;
  messageData: MessageData[];
  userInquiries: UserInquiry[];
  errorData: ChatbotError[];
  chatbotActivity: ChatbotActivity[];
  knowledgeSources: KnowledgeSourceStats[];
  agentTypes: { name: string; count: number }[];
  formSubmissions: { date: string; count: number }[];
  topPerformingChatbots: { name: string; messages: number }[];
}

// Placeholder for skeleton loading states
const DashboardSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-10 w-[250px]" />
      <Skeleton className="h-10 w-[200px]" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[120px] w-full" />
      ))}
    </div>
    <Skeleton className="h-[350px] w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-[300px] w-full" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  </div>
);

export default function TestDashboardPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      if (session?.user?.id) {
        try {
          setLoading(true);
          
          // In a real implementation, you'd pass the timeRange to the API
          const response = await fetch(`/api/dashboard/stats?timeRange=${timeRange}`);
          const data = await response.json();
          
          // Transform the data as needed
          setDashboardData(data);
          setLoading(false);
        } catch (error) {
          console.error('Failed to fetch dashboard stats:', error);
          setLoading(false);
        }
      }
    };

    if (session) {
      fetchData();
    }
  }, [session, timeRange]);

  // Calculate badge color based on percentage
  const getBadgeColor = (percent: number) => {
    if (percent > 10) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
    if (percent < 0) return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20';
    return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
  };

  // Format percentage for display
  const formatPercent = (percent: number) => {
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  if (loading || !dashboardData) {
    return (
      <div className="p-6 space-y-6">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard header with filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name?.split(' ')[0]}! Here's what's happening with your assistants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue={timeRange} onValueChange={(value) => setTimeRange(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Badge className={getBadgeColor(dashboardData.stats.percentChange.agents)}>{formatPercent(dashboardData.stats.percentChange.agents)}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.stats.totalAgents > 0 ? `${Math.round(dashboardData.stats.activeUsers / dashboardData.stats.totalAgents * 100)}% active` : '0% active'}
            </p>
            <ProgressBar value={dashboardData.stats.totalAgents > 0 ? (dashboardData.stats.activeUsers / dashboardData.stats.totalAgents * 100) : 0} 
              color="neutral" className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Badge className={getBadgeColor(dashboardData.stats.percentChange.messages)}>{formatPercent(dashboardData.stats.percentChange.messages)}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.stats.messageCountLast30Days.toLocaleString()} in the last 30 days
            </p>
            <ProgressBar value={70} color="neutral" className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Knowledge Sources</CardTitle>
            <Badge className={getBadgeColor(dashboardData.stats.percentChange.knowledgeSources)}>{formatPercent(dashboardData.stats.percentChange.knowledgeSources)}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalKnowledgeSources}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.stats.totalFiles.toLocaleString()} files uploaded
            </p>
            <ProgressBar value={85} color="neutral" className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main dashboard content with tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Messages Chart */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Message Activity</CardTitle>
                <CardDescription>
                  Total messages over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChart
                  className="h-72"
                  data={dashboardData.messageData}
                  index="date"
                  categories={["Messages"]}
                  colors={["neutral"]}
                  valueFormatter={(value) => `${value.toLocaleString()} msgs`}
                  showLegend={false}
                  showAnimation
                />
              </CardContent>
            </Card>

            {/* Agent Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Types</CardTitle>
                <CardDescription>
                  Distribution of agent types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DonutChart
                  className="h-60"
                  data={dashboardData.agentTypes}
                  category="count"
                  index="name"
                  colors={["neutral", "cyan", "amber", "emerald", "rose"]}
                  valueFormatter={(value) => `${value} agents`}
                  showAnimation
                />
              </CardContent>
            </Card>

            {/* Top Performing Agents */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Top Performing Agents</CardTitle>
                  <CardDescription>
                    Most active agents by message count
                  </CardDescription>
                </div>
                <Button variant="secondary" size="sm">
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <BarChart
                  className="h-60"
                  data={dashboardData.topPerformingChatbots}
                  index="name"
                  categories={["messages"]}
                  colors={["neutral"]}
                  valueFormatter={(value) => `${value.toLocaleString()} msgs`}
                  showLegend={false}
                  showAnimation
                />
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity and Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest interactions and events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <List>
                    {dashboardData.userInquiries.slice(0, 5).map((inquiry) => (
                      <ListItem key={inquiry.id} className="py-3">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarFallback style={{ backgroundColor: inquiry.bgColor, color: inquiry.textColor }}>
                              {inquiry.initial}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{inquiry.name}</p>
                              <p className="text-xs text-muted-foreground">{inquiry.time}</p>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{inquiry.inquiry}</p>
                          </div>
                        </div>
                      </ListItem>
                    ))}

                    {dashboardData.errorData.slice(0, 3).map((error) => (
                      <ListItem key={error.id} className="py-3">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-full flex items-center justify-center bg-rose-100 text-rose-700 dark:bg-rose-900/20">
                            <span className="text-xs">ERR</span>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{error.chatbotName}</p>
                              <p className="text-xs text-muted-foreground">{error.date}</p>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{error.errorMessage}</p>
                          </div>
                        </div>
                      </ListItem>
                    ))}
                  </List>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="secondary">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Agent
                </Button>
                <Button className="w-full justify-start" variant="secondary">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Upload Knowledge
                </Button>
                <Button className="w-full justify-start" variant="secondary">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Settings
                </Button>
                <div className="mt-6">
                  <TremorCard decoration="top" decorationColor="neutral">
                    <Text>Subscription Status</Text>
                    <Metric>Pro Plan</Metric>
                    <Text className="mt-4 text-sm">Renews on Nov 12, 2023</Text>
                    <ProgressBar value={65} color="neutral" className="mt-2" />
                    <Text className="mt-1 text-xs text-muted-foreground">65% of your monthly quota used</Text>
                  </TremorCard>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Agent Performance</CardTitle>
                <CardDescription>
                  Activity and performance metrics for all agents
                </CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Agent
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {dashboardData.chatbotActivity.map((agent) => (
                    <TremorCard key={agent.id} decoration="left" decorationColor={agent.status === 'active' ? 'emerald' : agent.status === 'training' ? 'amber' : 'slate'}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <div>
                          <Flex justifyContent="start" alignItems="center" className="gap-2">
                            <Title>{agent.name}</Title>
                            <Badge color={agent.status === 'active' ? 'emerald' : agent.status === 'training' ? 'amber' : 'slate'}>
                              {agent.status}
                            </Badge>
                          </Flex>
                          <Text>Last active: {agent.lastActive}</Text>
                        </div>
                        <Grid numItems={3} className="mt-2 md:mt-0 gap-4">
                          <Col>
                            <Text>Messages (7d)</Text>
                            <Metric>{agent.messagesLast7Days}</Metric>
                          </Col>
                          <Col>
                            <Text>Avg Response</Text>
                            <Metric>{agent.averageResponseTime}s</Metric>
                          </Col>
                          <Col>
                            <Text>Error Rate</Text>
                            <Metric>{agent.errorRate}%</Metric>
                          </Col>
                        </Grid>
                      </div>
                    </TremorCard>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Tab */}
        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Knowledge Sources</CardTitle>
                <CardDescription>
                  Files, websites, and other knowledge sources
                </CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Source
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {dashboardData.knowledgeSources.map((source) => (
                    <TremorCard key={source.id} className="p-4">
                      <Grid numItemsLg={5} className="gap-4">
                        <Col numColSpanLg={2}>
                          <Text>{source.name}</Text>
                          <Badge color={source.type === 'file' ? 'blue' : source.type === 'website' ? 'emerald' : source.type === 'qa' ? 'amber' : source.type === 'catalog' ? 'neutral' : 'rose'}>
                            {source.type}
                          </Badge>
                        </Col>
                        <Col>
                          <Text>Documents</Text>
                          <Metric>{source.documentCount}</Metric>
                        </Col>
                        <Col>
                          <Text>Used By</Text>
                          <Metric>{source.usedBy} agents</Metric>
                        </Col>
                        <Col>
                          <Text>Last Updated</Text>
                          <Metric>{source.lastUpdated}</Metric>
                        </Col>
                      </Grid>
                    </TremorCard>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inquiries Tab */}
        <TabsContent value="inquiries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Inquiries</CardTitle>
              <CardDescription>
                User support requests and inquiries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {dashboardData.userInquiries.map((inquiry) => (
                    <TremorCard key={inquiry.id} className="p-4">
                      <Flex alignItems="start">
                        <Avatar className="mr-3">
                          <AvatarFallback style={{ backgroundColor: inquiry.bgColor, color: inquiry.textColor }}>
                            {inquiry.initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Flex justifyContent="between" alignItems="start">
                            <div>
                              <Title>{inquiry.name}</Title>
                              <Text>{inquiry.email}</Text>
                            </div>
                            <div className="text-right">
                              <Badge color={inquiry.status === 'resolved' ? 'emerald' : inquiry.status === 'in-progress' ? 'amber' : 'rose'}>
                                {inquiry.status}
                              </Badge>
                              <Text>{inquiry.time}</Text>
                            </div>
                          </Flex>
                          <Text className="mt-3">{inquiry.inquiry}</Text>
                        </div>
                      </Flex>
                    </TremorCard>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Errors</CardTitle>
              <CardDescription>
                Errors and issues with your agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {dashboardData.errorData.map((error) => (
                    <TremorCard key={error.id} decoration="left" decorationColor={error.severity === 'high' ? 'rose' : error.severity === 'medium' ? 'amber' : 'blue'}>
                      <Flex alignItems="start">
                        <div className="flex-1">
                          <Flex justifyContent="between" alignItems="start">
                            <div>
                              <Title>{error.chatbotName}</Title>
                              <Text>Thread ID: {error.threadId}</Text>
                            </div>
                            <div className="text-right">
                              <Badge color={error.severity === 'high' ? 'rose' : error.severity === 'medium' ? 'amber' : 'blue'}>
                                {error.severity}
                              </Badge>
                              <Text>{error.date}</Text>
                            </div>
                          </Flex>
                          <Text className="mt-3 text-sm bg-slate-50 dark:bg-slate-900 p-2 rounded-xl">{error.errorMessage}</Text>
                        </div>
                      </Flex>
                    </TremorCard>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 