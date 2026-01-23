import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"; // Added Tooltip
import { CheckCircle, Clock, AlertTriangle, Users, ArrowRightIcon } from "lucide-react";
import { useSelector } from "react-redux"; // Added to detect theme

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// Separated text colors for Icons vs Backgrounds for Badges
const PRIORITY_STYLES = {
    LOW: { text: "text-red-600 dark:text-red-400", bar: "bg-red-600" },
    MEDIUM: { text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-600" },
    HIGH: { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-600" },
};

const ProjectAnalytics = ({ project, tasks }) => {
    
    const { theme } = useSelector(state => state.theme); // Get theme for Charts
    const isDark = theme === "dark";

    const { stats, statusData, typeData, priorityData } = useMemo(() => {
        const now = new Date();
        const total = tasks.length;

        const stats = {
            total,
            completed: 0,
            inProgress: 0,
            todo: 0,
            overdue: 0,
        };

        const statusMap = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
        const typeMap = { TASK: 0, BUG: 0, FEATURE: 0, IMPROVEMENT: 0, OTHER: 0 };
        const priorityMap = { LOW: 0, MEDIUM: 0, HIGH: 0 };

        tasks.forEach((t) => {
            if (t.status === "DONE") stats.completed++;
            if (t.status === "IN_PROGRESS") stats.inProgress++;
            if (t.status === "TODO") stats.todo++;
            
            // FIX: Check if date exists before comparing
            if (t.due_date && new Date(t.due_date) < now && t.status !== "DONE") {
                stats.overdue++;
            }

            if (statusMap[t.status] !== undefined) statusMap[t.status]++;
            if (typeMap[t.type] !== undefined) typeMap[t.type]++;
            if (priorityMap[t.priority] !== undefined) priorityMap[t.priority]++;
        });

        return {
            stats,
            statusData: Object.entries(statusMap).map(([k, v]) => ({ name: k.replace("_", " "), value: v })),
            typeData: Object.entries(typeMap).filter(([_, v]) => v > 0).map(([k, v]) => ({ name: k, value: v })),
            priorityData: Object.entries(priorityMap).map(([k, v]) => ({
                name: k,
                value: v,
                percentage: total > 0 ? Math.round((v / total) * 100) : 0,
            })),
        };
    }, [tasks]);

    const completionRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

    const metrics = [
        {
            label: "Completion Rate",
            value: `${completionRate}%`,
            color: "text-emerald-600 dark:text-emerald-400",
            icon: <CheckCircle className="size-5 text-emerald-600 dark:text-emerald-400" />,
            bg: "bg-emerald-200 dark:bg-emerald-500/10",
        },
        {
            label: "Active Tasks",
            value: stats.inProgress,
            color: "text-blue-600 dark:text-blue-400",
            icon: <Clock className="size-5 text-blue-600 dark:text-blue-400" />,
            bg: "bg-blue-200 dark:bg-blue-500/10",
        },
        {
            label: "Overdue Tasks",
            value: stats.overdue,
            color: "text-red-600 dark:text-red-400",
            icon: <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />,
            bg: "bg-red-200 dark:bg-red-500/10",
        },
        {
            label: "Team Size",
            value: project?.members?.length || 0,
            color: "text-purple-600 dark:text-purple-400",
            icon: <Users className="size-5 text-purple-600 dark:text-purple-400" />,
            bg: "bg-purple-200 dark:bg-purple-500/10",
        },
    ];

    // Chart Colors based on theme
    const axisColor = isDark ? "#a1a1aa" : "#52525b"; // zinc-400 vs zinc-600
    const gridColor = isDark ? "#3f3f46" : "#e4e4e7"; // zinc-700 vs zinc-200

    return (
        <div className="space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((m, i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm">{m.label}</p>
                                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                            </div>
                            <div className={`p-2 rounded-md ${m.bg}`}>{m.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Tasks by Status */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Tasks by Status</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={statusData}>
                            <XAxis
                                dataKey="name"
                                tick={{ fill: axisColor, fontSize: 12 }}
                                axisLine={{ stroke: gridColor }}
                                tickLine={false}
                            />
                            <YAxis 
                                tick={{ fill: axisColor, fontSize: 12 }} 
                                axisLine={{ stroke: gridColor }} 
                                tickLine={false}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: isDark ? '#18181b' : '#fff', borderColor: gridColor }}
                                itemStyle={{ color: isDark ? '#fff' : '#000' }}
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Tasks by Type */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Tasks by Type</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={typeData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                innerRadius={60} // Added innerRadius for modern Donut look
                                paddingAngle={5}
                                label={({ name, value }) => `${name}: ${value}`}
                            >
                                {typeData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke={isDark ? "#18181b" : "#fff"} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: isDark ? '#18181b' : '#fff', borderColor: gridColor }}
                                itemStyle={{ color: isDark ? '#fff' : '#000' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Priority Breakdown */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Tasks by Priority</h2>
                <div className="space-y-4">
                    {priorityData.map((p) => (
                        <div key={p.name} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    {/* FIX: Corrected Icon Color Logic */}
                                    <ArrowRightIcon className={`size-3.5 ${PRIORITY_STYLES[p.name].text}`} />
                                    <span className="text-zinc-700 dark:text-zinc-300 capitalize">{p.name.toLowerCase()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-zinc-500 dark:text-zinc-400 text-sm">{p.value} tasks</span>
                                    <span className="px-2 py-0.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs rounded">
                                        {p.percentage}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full ${PRIORITY_STYLES[p.name].bar}`}
                                    style={{ width: `${p.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProjectAnalytics;