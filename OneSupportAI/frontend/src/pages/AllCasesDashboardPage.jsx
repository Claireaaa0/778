import React, { useState, useEffect, useCallback } from "react";
import "../styles/pages/AllCasesDashboardPage.css";
import Sidebar from "../components/Sidebar";
import { Line } from "react-chartjs-2";
import { useUser } from "../hooks/useUser";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getCaseDashboardData } from "../services/caseService";
import { getAllUsers } from "../services/userService";
import Select from 'react-select';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

const metricsDescriptions = {
  completionRate:
    "Total active working time for each agent (time spent editing cases)",
  closedCases:
    "Number of cases resolved by the selected agent on each specific day/month",
  pendingCases:
    "Total number of cases in pending status on each specific day/month for the selected agent",
  statusTouches:
    "Cumulative Case Resolution Rate: (Total number of closed cases up to and including this date) / (Total number of cases up to and including this date)",
};

const tooltipCallbacks = {
  completionRate: {
    label: (context) => `Active Working Time: ${context.raw.toFixed(2)} hours`,
  },
  closedCases: {
    label: (context) => `Cases Resolved: ${context.raw}`,
  },
  pendingCases: {
    label: (context) => `Active Pending Cases: ${context.raw}`,
  },
  statusTouches: {
    label: (context) =>
      `Cumulative Resolution Rate: ${(context.raw * 100).toFixed(
        1
      )}% (${context.raw.toFixed(2)})`,
  },
};

const getChartOptions = (metricType, doesUseMonth = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: "index",
      intersect: false,
      callbacks: tooltipCallbacks[metricType],
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      titleColor: "#333",
      bodyColor: "#666",
      borderColor: "#ddd",
      borderWidth: 1,
      padding: 10,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      type: "time",
      time: {
        unit: doesUseMonth ? "month" : "day",
        displayFormats: {
          day: "MMM d",
          month: "MMM yyyy",
        },
        tooltipFormat: "MMM d, yyyy",
      },
      ticks: {
        autoSkip: false,
        maxRotation: 45,
      },
    },
    y: {
      beginAtZero: true,
      max: metricType === "statusTouches" ? 1 : undefined,
      grid: {
        color: "rgba(0, 0, 0, 0.1)",
      },
      ticks: {
        callback: (value) => {
          if (metricType === "completionRate") {
            return value.toFixed(1) + "h";
          }
          if (metricType === "closedCases" || metricType === "pendingCases") {
            return Math.round(value);
          }
          if (metricType === "statusTouches") {
            return (value * 100).toFixed(0) + "%";
          }
          return value.toFixed(1);
        },
        stepSize:
          metricType === "closedCases" || metricType === "pendingCases"
            ? 1
            : undefined,
      },
    },
  },
});

const timeRangeOptions = [
  {value: "week", label: "Last Week"},
  {value: "month", label: "Last Month"},
  {value: "quarter", label: "Last Quarter"},
  {value: "year", label: "Last Year"},
  
]
export default function AllCasesDashboardPage() {
  const { token, user } = useUser();
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [currentFilter, setCurrentFilter] = useState({
    agent: (user.isManager ? "all" : user?.id) || "",
    timeRange: "week",
  });
  const { isFetching, isLoading, isError, error, data } = useQuery(
    {
      queryKey: ["dashboard", currentFilter?.agent, currentFilter?.timeRange],
      retry: false,
      refetchOnWindowFocus: false,
      enabled: () => currentFilter?.agent && currentFilter?.timeRange && true,
      queryFn: async () => {

        return await getCaseDashboardData(
          token,
          currentFilter?.agent ||  (user.isManager ? "all" : user?.id),
          getStartDate(currentFilter?.timeRange).toISOString().split("T")[0] + "Z"
        );

        // return [];
      },
    }
);

  const {data: agentData, fetchNextPage} = useInfiniteQuery({
    queryKey: ['dashboard-users'],
    initialPageParam: {page: 1, limit: 10, search: ''},
    enabled: user.isManager,
    queryFn: async (params) => {
      return await getAllUsers(params.pageParam);
    },
    getNextPageParam: (lastPage) => {
      return {page: lastPage.pagination.page + 1, limit: 10, search: ''}
    },
  });

  const [metricsData, setMetricsData] = useState({
    completionRate: { labels: [], datasets: [] },
    closedCases: { labels: [], datasets: [] },
    pendingCases: { labels: [], datasets: [] },
    statusTouches: { labels: [], datasets: [] },
  });

  // Check user login status and initialize user-related state
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Set initial agent based on user role
    const initialAgent = user.isManager ? "all" : user.id;
    setCurrentFilter((prev) => ({ ...prev, agent: initialAgent }));
  }, [user, navigate]);

  function doUseMonthKey(range) {
    return range === "year" || range === "quarter";
  }
  function getDateKey(dateString, range) {
    if (dateString == "ALL") {
      const now = new Date();
      return doUseMonthKey(range)
        ? now.toISOString().slice(0, 7)
        : now.toISOString().split("T")[0];
    }
    return doUseMonthKey(range) ? dateString.slice(0, 7) : dateString;
  }

  function getStartDate(range) {
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setDate(now.getDate() - 30);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    return startDate;
  }
  const calculateMetrics = useCallback((data, range) => {
    const groupedData = {};
    const now = new Date();
    let startDate = getStartDate(range);
    // Initialize dates
    if (doUseMonthKey(range)) {
      for (
        let date = new Date(startDate);
        date <= now;
        date.setMonth(date.getMonth() + 1)
      ) {
        const monthKey = date.toISOString().slice(0, 7);
        if (!groupedData[monthKey]) {
          groupedData[monthKey] = {
            workingHours: 0,
            statusChanges: 0,
            casesCount: 0,
            closedCases: 0,
            pendingCases: 0,
            totalClosedToDate: 0,
            totalToDate: 0,
            completionRate: 0,
            pendingPeriodChecked: false,
          };
        }
      }
    } else {
      for (
        let date = new Date(startDate);
        date <= now;
        date.setDate(date.getDate() + 1)
      ) {
        const dateKey = date.toISOString().split("T")[0];
        groupedData[dateKey] = {
          workingHours: 0,
          statusChanges: 0,
          casesCount: 0,
          closedCases: 0,
          pendingCases: 0,
          totalClosedToDate: 0,
          totalToDate: 0,
          completionRate: 0,
          pendingPeriodChecked: false,
        };
      }
    }
    // Active Working Hours


    data?.data?.activeWorkTimes?.forEach((item) => {
      if (item.date != "ALL") {
        const dateKey = getDateKey(item.date, range);
        groupedData[dateKey].workingHours += parseFloat(item.value);
      }
    });
    

    // Counts
    data?.data?.daily?.forEach((item) => {
      const dateKey = getDateKey(item.date, range);
      groupedData[dateKey].pendingCases += item.pending || 0;
      groupedData[dateKey].closedCases += item.closed || 0;
      groupedData[dateKey].casesCount += item.all || 0;
    });

    data?.data?.total?.forEach((item) => {
      const dateKey = getDateKey(item.date, range);
      groupedData[dateKey].completionRate = item.all != 0 ? ((item.closed || 0) / item.all) : 0;
    });

    // Convert to chart format
    const dates = Object.keys(groupedData).sort();

    console.log(
      "Metrics for each date:",
      dates.reduce((acc, date) => {
        acc[date] = {
          workingHours: groupedData[date].workingHours,
          pending: groupedData[date].pendingCases,
          closed: groupedData[date].closedCases,
          completionRate: groupedData[date].completionRate,
        };
        return acc;
      }, {})
    );

    return {
      labels: dates,
      metrics: {
        completionRate: dates.map((date) => groupedData[date].workingHours),
        closedCases: dates.map((date) => groupedData[date].closedCases),
        pendingCases: dates.map((date) => groupedData[date].pendingCases),
        statusTouches: dates.map(
          (date) => groupedData[date].completionRate
        ),
      },
    };
  }, []);

  const updateMetricsData = useCallback(
    (
      range = currentFilter.timeRange,
      aData = data
    ) => {
      const { labels, metrics } = calculateMetrics(
        aData,
        range
      );
      const formattedLabels = labels.map((label) => {
        const date = new Date(label);
        return date.toISOString();
      });

      setMetricsData({
        completionRate: {
          labels: formattedLabels,
          datasets: [
            {
              label: "Active Working Hours",
              data: metrics.completionRate,
              borderColor: "rgb(75, 192, 192)",
              backgroundColor: "rgba(75, 192, 192, 0.1)",
              tension: 0.1,
              fill: true,
            },
          ],
        },
        closedCases: {
          labels: formattedLabels,
          datasets: [
            {
              label: "Resolved Cases",
              data: metrics.closedCases,
              borderColor: "rgb(153, 102, 255)",
              backgroundColor: "rgba(153, 102, 255, 0.1)",
              tension: 0.1,
              fill: true,
            },
          ],
        },
        pendingCases: {
          labels: formattedLabels,
          datasets: [
            {
              label: "Pending Workload",
              data: metrics.pendingCases,
              borderColor: "rgb(255, 159, 64)",
              backgroundColor: "rgba(255, 159, 64, 0.1)",
              tension: 0.1,
              fill: true,
            },
          ],
        },
        statusTouches: {
          labels: formattedLabels,
          datasets: [
            {
              label: "Cumulative Resolution Rate (Closed Cases / Total Cases)",
              data: metrics.statusTouches,
              borderColor: "rgb(255, 99, 132)",
              backgroundColor: "rgba(255, 99, 132, 0.1)",
              tension: 0.1,
              fill: true,
            },
          ],
        },
      });
    },
    [
      currentFilter.timeRange,
      data,
      calculateMetrics,
    ]
  );

  // const handleAgentChange = useCallback((agent) => {
  //   setSelectedAgent(agent);
  // }, []);

  // const handleTimeRangeChange = useCallback((range) => {
  //   console.log(range);
  //   setTimeRange(range);
  // }, []);

  const handleConfirmFilter = useCallback(async () => {
    const fd = new FormData(document.getElementById("filter-form"));
    const agent = fd.get("agent");
    const timeRange = fd.get("time-range")
    setCurrentFilter({ agent, timeRange });
  }, []);

  // Set default data only on initial load
  useEffect(() => {
    // const isInitialLoad = cases.length > 0 &&
    //                      (currentFilter.agent === 'all' || currentFilter.agent === user.id) &&
    //                      currentFilter.timeRange === 'week';

    // if (data) {
    updateMetricsData(
      currentFilter.timeRange,
      data
    );
    // }
  }, [
    currentFilter.agent,
    currentFilter.timeRange,
    data,
    updateMetricsData,
    user.id,
  ]);

  useEffect(() => {
    const isManager = user.isManager;
    const options =
      agentData?.pages?.flatMap(({users}) => (users.map((agent) => {return {value: agent.id, label: agent.userName}}))) || []
    setAgents(isManager ? [{value: "all", label: "All Agents"}, ...options] : [{value: user.id, label: user.userName}]);
  },[agentData, user.id, user.isManager, user.userName])

  if (isLoading || isFetching) {
    return <div className="loading">Loading...</div>;
  }

  if (isError && error) {
    return <div className="loading">Error: {error}</div>;
  }
  return (
    <div className="page-container">
      <div className="main-content">
        <div className="dashboard-header">
          <h1>Performance Dashboard</h1>
          <div className="filter-section">
            <form id="filter-form">
            <Select 
              defaultValue={agents.find((item) => item.value == currentFilter?.agent) || agents[0]}
              options={agents}
              className="filter-input"
              onMenuScrollToBottom={fetchNextPage}
              isSearchable={false}
              isDisabled={!user?.isManager}
              name="agent"
              form="filter-form"
            />
            <Select
              defaultValue={timeRangeOptions.find((item) => item.value == currentFilter?.timeRange) || timeRangeOptions[0]}
              className="filter-input"
              name="time-range"
              form="filter-form"
              isSearchable={false}
              options={timeRangeOptions}
            />
            <button className="btn-primary" onClick={handleConfirmFilter}>
              Confirm
            </button>
            </form>
          </div>
        </div>

        {currentFilter && (
          <div className="result-info">
            Showing results for:{" "}
            {currentFilter.agent === "all"
              ? "All Agents"
              : agents?.find((a) => a.value === currentFilter.agent)?.label || ""}
            (
            {currentFilter.timeRange === "week"
              ? "Last Week"
              : currentFilter.timeRange === "month"
              ? "Last Month"
              : currentFilter.timeRange === "quarter"
              ? "Last Quarter"
              : "Last Year"}
            )
          </div>
        )}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <h3>Agent Active Working Time</h3>
              <div className="tooltip-container">
                <div className="tooltip-icon">?</div>
                <div className="tooltip-text">
                  {metricsDescriptions.completionRate}
                </div>
              </div>
            </div>
            <div className="metric-chart">
              <Line
                data={metricsData.completionRate}
                options={getChartOptions("completionRate", doUseMonthKey(currentFilter.timeRange))}
              />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <h3>Resolved Cases</h3>
              <div className="tooltip-container">
                <div className="tooltip-icon">?</div>
                <div className="tooltip-text">
                  {metricsDescriptions.closedCases}
                </div>
              </div>
            </div>
            <div className="metric-chart">
              <Line
                data={metricsData.closedCases}
                options={getChartOptions("closedCases", doUseMonthKey(currentFilter.timeRange))}
              />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <h3>Pending Workload</h3>
              <div className="tooltip-container">
                <div className="tooltip-icon">?</div>
                <div className="tooltip-text">
                  {metricsDescriptions.pendingCases}
                </div>
              </div>
            </div>
            <div className="metric-chart">
              <Line
                data={metricsData.pendingCases}
                options={getChartOptions("pendingCases", doUseMonthKey(currentFilter.timeRange))}
              />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <h3>Cumulative Case Resolution Rate</h3>
              <div className="tooltip-container">
                <div className="tooltip-icon">?</div>
                <div className="tooltip-text">
                  {metricsDescriptions.statusTouches}
                </div>
              </div>
            </div>
            <div className="metric-chart">
              <Line
                data={metricsData.statusTouches}
                options={getChartOptions("statusTouches", doUseMonthKey(currentFilter.timeRange))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
