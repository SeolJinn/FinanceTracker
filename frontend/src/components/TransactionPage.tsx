import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { 
  TransactionResponse, 
  TransactionType, 
  CreateTransactionRequest,
  transactionService,
  ApiError
} from '../services/transactionService';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface TransactionPageProps {
  onBack?: () => void;
}

export const TransactionPage: React.FC<TransactionPageProps> = ({ onBack }) => {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [filter, setFilter] = useState<{
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
  }>({});

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await transactionService.getTransactions(
        filter.startDate,
        filter.endDate,
        filter.type
      );
      setTransactions(data);
      const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
      setPage((p) => Math.min(p, totalPages));
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (transactionData: CreateTransactionRequest) => {
    try {
      setSubmitting(true);
      setError('');
      
      if (editingTransaction) {
        await transactionService.updateTransaction(editingTransaction.id, transactionData);
      } else {
        await transactionService.createTransaction(transactionData);
      }
      
      setShowForm(false);
      setEditingTransaction(null);
      await loadTransactions();
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to save transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTransaction = (transaction: TransactionResponse) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      setError('');
      await transactionService.deleteTransaction(id);
      await loadTransactions();
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to delete transaction');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  const calculateTotals = () => {
    const income = transactions
      .filter(t => t.type === TransactionType.Income)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === TransactionType.Expense)
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expenses, balance: income - expenses };
  };

  const totals = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const toYMD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseYMD = (value?: string) => {
    if (!value) return undefined;
    const [y, m, d] = value.split('-').map((x) => parseInt(x, 10));
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  };

  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const startIndex = transactions.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = transactions.length === 0 ? 0 : Math.min(page * pageSize, transactions.length);
  const paginatedTransactions = transactions.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          )}
          <h1 className="text-3xl font-bold">Expense & Income Tracker</h1>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            Add Transaction
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        <Card className="p-4 lg:col-span-3">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Income</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.income)}</p>
        </Card>
        <Card className="p-4 lg:col-span-3">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Expenses</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.expenses)}</p>
        </Card>
        <Card className="p-4 lg:col-span-3">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Balance</h3>
          <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totals.balance)}
          </p>
        </Card>
        <Card className="p-4 lg:col-span-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Transactions</h3>
          <p className="text-2xl font-bold text-foreground">{transactions.length}</p>
        </Card>
      </div>

      {/* Filters */}
      {!showForm && (
        <Card className="p-4 mb-6">
          <h3 className="text-lg font-medium mb-3">Filters</h3>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select
                value={String(typeof filter.type === 'number' ? filter.type : '')}
                onValueChange={(val: string) =>
                  setFilter((prev) => ({
                    ...prev,
                    type: parseInt(val) as TransactionType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(TransactionType.Income)}>
                    Income
                  </SelectItem>
                  <SelectItem value={String(TransactionType.Expense)}>
                    Expense
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {filter.startDate ? parseYMD(filter.startDate)?.toLocaleDateString() : 'Start date'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 border-0 w-auto bg-transparent shadow-none" align="start">
                  <Calendar
                    mode="single"
                    selected={parseYMD(filter.startDate)}
                    onSelect={(d) =>
                      setFilter((prev) => ({ ...prev, startDate: d ? toYMD(d) : undefined }))
                    }
                    className="rounded-md border shadow-sm"
                    captionLayout="label"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {filter.endDate ? parseYMD(filter.endDate)?.toLocaleDateString() : 'End date'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 border-0 w-auto bg-transparent shadow-none" align="start">
                  <Calendar
                    mode="single"
                    selected={parseYMD(filter.endDate)}
                    onSelect={(d) =>
                      setFilter((prev) => ({ ...prev, endDate: d ? toYMD(d) : undefined }))
                    }
                    className="rounded-md border shadow-sm"
                    captionLayout="label"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end lg:col-span-3">
              <Button 
                variant="outline" 
                onClick={() => setFilter({})}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Form or Transaction List */}
      {showForm ? (
        <TransactionForm
          transaction={editingTransaction || undefined}
          onSubmit={handleCreateTransaction}
          onCancel={handleCancelForm}
          isLoading={submitting}
        />
      ) : (
        <>
          {loading ? (
            <Card className="p-8 text-center">
              <p>Loading transactions...</p>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex}-{endIndex} of {transactions.length}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Rows per page</label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val: string) => {
                      setPageSize(parseInt(val, 10));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50, 100].map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-auto pr-1 custom-scrollbar">
                <TransactionList
                  transactions={paginatedTransactions}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteTransaction}
                  isLoading={submitting}
                />
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};