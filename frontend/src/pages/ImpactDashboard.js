import { useState, useEffect } from 'react';
import api from '../config/api';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { TrendingUp, Users, UtensilsCrossed, Truck, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Impact Dashboard
 * Displays platform statistics and analytics charts
 */
const ImpactDashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, chartsResponse] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/charts')
      ]);

      setStats(statsResponse.data.stats);
      setChartData(chartsResponse.data.charts);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats || !chartData) {
    return <div>No data available</div>;
  }

  const statCards = [
    {
      title: 'Total Food Listings',
      value: stats.totalFoodListings,
      icon: UtensilsCrossed,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Meals Delivered',
      value: stats.totalMealsDelivered,
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      title: 'Active Donors',
      value: stats.activeDonors,
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      title: 'Active Volunteers',
      value: stats.activeVolunteers,
      icon: Truck,
      color: 'bg-orange-500'
    }
  ];

  const deliveriesOverTimeOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Deliveries Over Time (Last 30 Days)'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const urgencyOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Food Listings by Urgency'
      }
    }
  };

  const statusOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Food Listings by Status'
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Impact Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform statistics and analytics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Completed</span>
              <span className="font-semibold">{stats.completedDeliveries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending</span>
              <span className="font-semibold">{stats.pendingDeliveries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">In Transit</span>
              <span className="font-semibold">{stats.inTransitDeliveries}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Urgency Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-red-600">High</span>
              <span className="font-semibold">{stats.urgencyBreakdown.high}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-600">Medium</span>
              <span className="font-semibold">{stats.urgencyBreakdown.medium}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Low</span>
              <span className="font-semibold">{stats.urgencyBreakdown.low}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Deliveries (7 days)</span>
              <span className="font-semibold">{stats.recentDeliveries}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <Line
            data={{
              labels: chartData.deliveriesOverTime.labels,
              datasets: [
                {
                  label: 'Deliveries',
                  data: chartData.deliveriesOverTime.data,
                  borderColor: 'rgb(34, 197, 94)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  tension: 0.4
                }
              ]
            }}
            options={deliveriesOverTimeOptions}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <Doughnut
            data={{
              labels: chartData.urgencyBreakdown.labels,
              datasets: [
                {
                  data: chartData.urgencyBreakdown.data,
                  backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(234, 179, 8, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
                  ]
                }
              ]
            }}
            options={urgencyOptions}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <Bar
            data={{
              labels: chartData.statusBreakdown.labels,
              datasets: [
                {
                  label: 'Food Listings',
                  data: chartData.statusBreakdown.data,
                  backgroundColor: 'rgba(34, 197, 94, 0.8)'
                }
              ]
            }}
            options={statusOptions}
          />
        </div>
      </div>
    </div>
  );
};

export default ImpactDashboard;
