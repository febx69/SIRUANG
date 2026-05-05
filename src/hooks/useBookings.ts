import { useState, useEffect } from "react";
import { BookingData } from "@/components/Booking/BookingForm";

export const useBookings = () => {
  const [bookings, setBookings] = useState<BookingData[]>([]);

  useEffect(() => {
    // Load bookings from localStorage on init
    const savedBookings = localStorage.getItem('roomBookings');
    if (savedBookings) {
      try {
        setBookings(JSON.parse(savedBookings));
      } catch (error) {
        console.error('Error loading bookings:', error);
      }
    }
  }, []);

  const saveBookings = (updatedBookings: BookingData[]) => {
    setBookings(updatedBookings);
    localStorage.setItem('roomBookings', JSON.stringify(updatedBookings));
  };

  const addBooking = (bookingData: Omit<BookingData, 'id' | 'createdAt'>) => {
    const newBooking: BookingData = {
      ...bookingData,
      id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    
    const updatedBookings = [...bookings, newBooking];
    saveBookings(updatedBookings);
  };

  const updateBooking = (id: string, updatedData: Partial<BookingData>) => {
    const updatedBookings = bookings.map(booking =>
      booking.id === id ? { ...booking, ...updatedData } : booking
    );
    saveBookings(updatedBookings);
  };

  const deleteBooking = (id: string) => {
    const updatedBookings = bookings.filter(booking => booking.id !== id);
    saveBookings(updatedBookings);
  };

  const bulkDeleteByPeriod = (period: 'month' | 'quarter' | 'year') => {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (period) {
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    const updatedBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= cutoffDate;
    });
    
    saveBookings(updatedBookings);
  };

  const getActiveBookings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= today;
    });
  };

  const getAllBookings = () => {
    return bookings;
  };

  const exportToExcel = (period: 'month' | 'quarter' | 'year') => {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (period) {
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    const filteredBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= cutoffDate;
    });

    // Simple CSV export (in a real app, you'd use a proper Excel library)
    const csvContent = [
      ['Tanggal', 'Nama Peminjam', 'Ruangan', 'Waktu Mulai', 'Waktu Selesai', 'Keterangan'],
      ...filteredBookings.map(booking => [
        booking.date,
        booking.name,
        booking.room,
        booking.startTime,
        booking.endTime,
        booking.description
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `peminjaman-ruangan-${period}-${now.toISOString().split('T')[0]}.csv`);
    a.click();
  };

  return {
    bookings,
    addBooking,
    updateBooking,
    deleteBooking,
    bulkDeleteByPeriod,
    getActiveBookings,
    getAllBookings,
    exportToExcel
  };
};