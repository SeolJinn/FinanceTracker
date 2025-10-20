import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { TransactionResponse, TransactionType } from '../services/transactionService';

interface TransactionListProps {
  transactions: TransactionResponse[];
  onEdit: (transaction: TransactionResponse) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm(id);
  };

  const handleDeleteConfirm = (id: number) => {
    onDelete(id);
    setDeleteConfirm(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No transactions found. Add your first transaction to get started!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <Card key={transaction.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  transaction.type === TransactionType.Income 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {transaction.type === TransactionType.Income ? 'Income' : 'Expense'}
                </div>
                <span className="font-medium">{transaction.categoryName}</span>
                <span className="text-gray-500 text-sm">{formatDate(transaction.date)}</span>
              </div>
              
              <div className="mt-2">
                <span className={`text-lg font-semibold ${
                  transaction.type === TransactionType.Income ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === TransactionType.Income ? '+' : '-'}{formatCurrency(transaction.amount, transaction.walletCurrency || 'USD')}
                </span>
                {transaction.note && (
                  <p className="text-gray-600 text-sm mt-1">{transaction.note}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              {deleteConfirm === transaction.id ? (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteConfirm(transaction.id)}
                    disabled={isLoading}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeleteCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(transaction)}
                    disabled={isLoading}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteClick(transaction.id)}
                    disabled={isLoading}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};