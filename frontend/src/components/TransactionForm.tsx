import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { DollarSign, Tag, StickyNote, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { CalendarComponent } from './Calendar';
import { 
  TransactionType, 
  CategoryType, 
  Category, 
  CreateTransactionRequest, 
  TransactionResponse,
  transactionService 
} from '../services/transactionService';
import { walletService } from '../services/walletService';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';

interface TransactionFormProps {
  transaction?: TransactionResponse;
  onSubmit: (transaction: CreateTransactionRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  transaction,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreateTransactionRequest>({
    amount: transaction?.amount || 0,
    type: transaction?.type || TransactionType.Expense,
    categoryId: transaction?.categoryId || 0,
    walletId: (transaction as any)?.walletId || 0,
    date: transaction?.date ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0],
    note: transaction?.note || ''
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<{ id: number; name: string; currencyCode: string }[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadCategories();
    loadWallets();
  }, [formData.type]);

  const loadCategories = async () => {
    try {
      const categoryType = formData.type === TransactionType.Expense ? CategoryType.Expense : CategoryType.Income;
      const data = await transactionService.getCategories(categoryType);
      setCategories(data);
      
      if (data.length > 0 && !transaction) {
        setFormData(prev => ({ ...prev, categoryId: data[0].id }));
      }
    } catch (err) {
      setError('Failed to load categories');
    }
  };

  const loadWallets = async () => {
    try {
      const data = await walletService.list();
      setWallets(data);
      if (data.length > 0 && !transaction) {
        setFormData(prev => ({ ...prev, walletId: data[0].id }));
      }
    } catch (err) {
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    
    if (formData.categoryId === 0) {
      setError('Please select a category');
      return;
    }
    if (!formData.walletId || formData.walletId === 0) {
      setError('Please select a wallet');
      return;
    }
    
    setError('');
    onSubmit(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : 
               name === 'type' ? parseInt(value) as TransactionType :
               name === 'categoryId' ? parseInt(value) :
               name === 'walletId' ? parseInt(value) : value
    }));
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

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {transaction ? 'Edit Transaction' : 'Add New Transaction'}
        </h2>
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="inline-flex gap-2">
              <Button
                type="button"
                variant={formData.type === TransactionType.Expense ? 'default' : 'outline'}
                onClick={() => setFormData(prev => ({ ...prev, type: TransactionType.Expense }))}
                disabled={isLoading}
                size="sm"
              >
                <ArrowDownCircle className="h-4 w-4 mr-2 text-red-500" />
                Expense
              </Button>
              <Button
                type="button"
                variant={formData.type === TransactionType.Income ? 'default' : 'outline'}
                onClick={() => setFormData(prev => ({ ...prev, type: TransactionType.Income }))}
                disabled={isLoading}
                size="sm"
              >
                <ArrowUpCircle className="h-4 w-4 mr-2 text-green-500" />
                Income
              </Button>
            </div>
          </div>
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium mb-2">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                step="0.01"
                min="0.01"
                className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition"
                disabled={isLoading}
                required
              />
            </div>
          </div>
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium mb-2">Category</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Select
                value={String(formData.categoryId || '')}
                onValueChange={(val: string) =>
                  setFormData((prev) => ({ ...prev, categoryId: parseInt(val) }))
                }
                disabled={isLoading}
              >
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        <div className="lg:col-span-3">
          <label className="block text-sm font-medium mb-2">Wallet</label>
          <select
            name="walletId"
            value={formData.walletId}
            onChange={handleInputChange}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={isLoading}
          >
            <option value={0}>Select a wallet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.currencyCode})</option>
            ))}
          </select>
        </div>
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium mb-2">Date</label>
            <CalendarComponent 
              value={parseYMD(formData.date)}
              onChange={(d) => {
                if (d) {
                  setFormData(prev => ({ ...prev, date: toYMD(d) }));
                }
              }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Note (optional)</label>
          <div className="relative">
            <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <textarea
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              rows={4}
              className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              disabled={isLoading}
              placeholder="Add a note about this transaction..."
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : (transaction ? 'Update' : 'Add')} Transaction
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};