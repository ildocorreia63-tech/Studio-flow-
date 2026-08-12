import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  MessageSquare,
  User,
  Calendar,
  Filter,
  Trash2,
  Check,
  X,
  ClipboardList,
} from 'lucide-react';
import { Business, CrmTask, CrmTaskStatus, CrmTaskPriority, CrmEventType } from '../../types';
import { DB } from '../../services/db';

interface CrmTasksTabProps {
  business: Business;
}

export const CrmTasksTab: React.FC<CrmTasksTabProps> = ({ business }) => {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [priorityFilter, setPriorityFilter] = useState<string>('TODAS');
  const [search, setSearch] = useState('');

  // New Task Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<CrmTask>>({});
  const [isSaving, setIsSaving] = useState(false);

  const loadTasks = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await DB.getCrmTasksAsync(business.id);
      setTasks(data);
    } catch (err) {
      console.error('Error loading CRM tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [business.id]);

  const handleUpdateStatus = async (taskId: string, status: CrmTaskStatus) => {
    try {
      await DB.updateCrmTaskStatusAsync(business.id, taskId, status);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    } catch (err: any) {
      alert('Erro ao atualizar tarefa: ' + err.message);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask.title || !editingTask.client_name) {
      alert('Preencha o Título e o Nome do Cliente para a tarefa.');
      return;
    }

    setIsSaving(true);
    try {
      await DB.saveCrmTaskAsync(business.id, {
        client_name: editingTask.client_name,
        title: editingTask.title,
        origin_event: (editingTask.origin_event || 'APPOINTMENT_COMPLETED') as CrmEventType,
        description: editingTask.description || '',
        priority: (editingTask.priority || 'NORMAL') as CrmTaskPriority,
        status: (editingTask.status || 'PENDING') as CrmTaskStatus,
        due_date: editingTask.due_date || new Date().toISOString().slice(0, 10),
        assigned_to: editingTask.assigned_to || 'Equipe CRM',
        id: editingTask.id,
      });

      setIsModalOpen(false);
      setEditingTask({});
      await loadTasks();
    } catch (err: any) {
      alert('Erro ao salvar tarefa: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenWhatsApp = (task: CrmTask) => {
    // Extract potential quote from description if present
    const quoteMatch = task.description.match(/"([^"]+)"/);
    const msg = quoteMatch ? quoteMatch[1] : `Olá ${task.client_name}, passando para falar sobre: ${task.title}`;
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.client_name.toLowerCase().includes(search.toLowerCase()) ||
      task.description.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'TODAS' ? true : task.status === statusFilter;

    const matchesPriority =
      priorityFilter === 'TODAS' ? true : task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: CrmTaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> CONCLUÍDA
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 flex items-center gap-1">
            <Clock className="w-3 h-3 animate-spin" /> EM ANDAMENTO
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> CANCELADA
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 flex items-center gap-1">
            <Clock className="w-3 h-3" /> PENDENTE
          </span>
        );
    }
  };

  const getPriorityBadge = (p: CrmTaskPriority) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">URGENTE</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">ALTA</span>;
      case 'NORMAL':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">NORMAL</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-purple-100 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-6 h-6 text-purple-700" />
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Tarefas Operacionais CRM</h2>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Gerencie tarefas recomendadas por automação ou criadas manualmente pela equipe de atendimento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadTasks(true)}
            disabled={refreshing}
            className="p-2.5 border border-gray-200 hover:border-purple-300 text-gray-600 rounded-2xl hover:bg-purple-50 transition flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 text-purple-700 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={() => {
              setEditingTask({
                status: 'PENDING',
                priority: 'NORMAL',
                due_date: new Date().toISOString().slice(0, 10),
              });
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {[
            { id: 'PENDING', label: 'Pendentes' },
            { id: 'IN_PROGRESS', label: 'Em Andamento' },
            { id: 'COMPLETED', label: 'Concluídas' },
            { id: 'CANCELLED', label: 'Canceladas' },
            { id: 'TODAS', label: 'Todas' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                statusFilter === st.id
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-900'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Priority Filter & Search */}
        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-gray-700 outline-none"
          >
            <option value="TODAS">Todas Prioridades</option>
            <option value="URGENT">Urgente</option>
            <option value="HIGH">Alta</option>
            <option value="NORMAL">Normal</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tarefa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-purple-100 shadow-xs">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-medium">Carregando tarefas CRM...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-purple-100 p-6 shadow-xs">
          <ClipboardList className="w-12 h-12 text-purple-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-800">Nenhuma tarefa encontrada</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
            Não há tarefas registradas com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-2xl border border-purple-100 p-4 shadow-xs hover:border-purple-200 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  {getStatusBadge(task.status)}
                  {getPriorityBadge(task.priority)}
                  {task.due_date && (
                    <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Prazo: {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-extrabold text-gray-900 truncate">{task.title}</h3>
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{task.description}</p>

                <div className="flex items-center space-x-3 mt-2 text-[10px] text-gray-400 font-semibold">
                  <span>Cliente: <strong className="text-gray-700">{task.client_name}</strong></span>
                  <span>•</span>
                  <span>Responsável: <strong className="text-gray-700">{task.assigned_to || 'Equipe'}</strong></span>
                </div>
              </div>

              {/* Task Quick Actions */}
              <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-gray-100">
                <button
                  onClick={() => handleOpenWhatsApp(task)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                  title="Abrir WhatsApp com mensagem recomendada"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>

                {task.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Concluir</span>
                  </button>
                )}

                {task.status === 'PENDING' && (
                  <button
                    onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition"
                  >
                    Em Andamento
                  </button>
                )}

                {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleUpdateStatus(task.id, 'CANCELLED')}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                    title="Cancelar Tarefa"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-lg font-black text-gray-900">Nova Tarefa CRM Manual</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria Silva"
                  value={editingTask.client_name || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, client_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Título da Tarefa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Oferecer desconto de retorno pós-30 dias"
                  value={editingTask.title || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Descrição / Instruções</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes ou mensagem recomendada para envio no WhatsApp..."
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Prioridade</label>
                  <select
                    value={editingTask.priority || 'NORMAL'}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, priority: e.target.value as CrmTaskPriority })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Data Limite (Prazo)</label>
                  <input
                    type="date"
                    value={editingTask.due_date || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {isSaving ? 'Salvando...' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
