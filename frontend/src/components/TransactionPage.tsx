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

  return (
    <div className="container mx-auto px-4 py-8">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Income</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.income)}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Expenses</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.expenses)}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Balance</h3>
          <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totals.balance)}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Transactions</h3>
          <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
        </Card>
      </div>

      {/* Filters */}
      {!showForm && (
        <Card className="p-4 mb-6">
          <h3 className="text-lg font-medium mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={filter.type ?? ''}
                onChange={(e) => setFilter(prev => ({ 
                  ...prev, 
                  type: e.target.value === '' ? undefined : parseInt(e.target.value) as TransactionType 
                }))}
                className="w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              >
                <option value="">All Types</option>
                <option value={TransactionType.Income}>Income</option>
                <option value={TransactionType.Expense}>Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={filter.startDate || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, startDate: e.target.value || undefined }))}
                className="w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={filter.endDate || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, endDate: e.target.value || undefined }))}
                className="w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              />
            </div>
            <div className="flex items-end">
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
            <TransactionList
              transactions={transactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              isLoading={submitting}
            />
          )}
        </>
      )}
    </div>
  );
};