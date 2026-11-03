// src/pages/Agenda.tsx
import { useState } from "react";
import { useAgenda } from "@/hooks/useAgenda";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Clock, ArrowLeft, ClipboardList, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import Header from "@/components/Layout/Header";

const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`
}

const formatTanggalPanjang = (dateStr: string) => {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
  } catch { return dateStr }
}

const Agenda = () => {
  const { user, logout } = useSupabaseAuth();
  const { isLoading, availableDates, getByDate } = useAgenda();
  const navigate = useNavigate();
  const todayStr = getTodayStr();

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [weekOffset, setWeekOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'specific'>('today');
  const [specificDate, setSpecificDate] = useState('');

  // Generate 7 hari untuk strip
  const stripDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + (i - 3) + (weekOffset * 7))
    const str = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`
    return { str, day: HARI[d.getDay()].slice(0,3), date: d.getDate(), month: BULAN[d.getMonth()].slice(0,3) }
  })

  // Tentukan tanggal aktif berdasarkan filter
  const activeDateStr = dateFilter === 'specific' && specificDate ? specificDate : selectedDate

  const selectedAgendas = getByDate(activeDateStr)

  // Filter berdasarkan search
  const filteredEntries = selectedAgendas.flatMap(a => a.entries).filter(e =>
    !searchTerm || e.acara.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.tempat.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDateClick = (str: string) => {
    setSelectedDate(str)
    setDateFilter('all')
    setSpecificDate('')
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={logout} />

      <main className="container mx-auto px-4 py-6 space-y-5 animate-fade-in">

        {/* Strip kalender + filter */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 space-y-4">

            {/* Strip tanggal */}
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(p => p - 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 shrink-0">
                <ChevronLeft size={15} />
              </button>
              <div className="flex gap-1.5 flex-1 justify-between">
                {stripDates.map(d => {
                  const isSelected = d.str === activeDateStr
                  const hasAgenda  = availableDates.includes(d.str)
                  const isToday    = d.str === todayStr
                  return (
                    <button key={d.str} onClick={() => handleDateClick(d.str)}
                      className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all flex-1"
                      style={{
                        background: isSelected ? '#0f172a' : 'transparent',
                        border: isToday && !isSelected ? '1.5px solid #0f172a' : '1.5px solid transparent',
                      }}>
                      <span style={{ fontSize:'10px', fontWeight:600, color: isSelected ? 'rgba(255,255,255,0.8)' : '#94a3b8' }}>{d.day}</span>
                      <span style={{ fontSize:'17px', fontWeight:700, color: isSelected ? 'white' : '#1e293b', lineHeight:1 }}>{d.date}</span>
                      <span style={{ fontSize:'10px', color: isSelected ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}>{d.month}</span>
                      <div style={{ width:'5px', height:'5px', borderRadius:'50%', marginTop:'2px',
                        background: hasAgenda ? (isSelected ? 'rgba(255,255,255,0.9)' : '#0f172a') : 'transparent' }} />
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setWeekOffset(p => p + 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 shrink-0">
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Filter bar — sama persis style BookingList */}
            <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="relative w-full xl:w-1/3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Cari acara atau tempat..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white border-slate-200 h-9 text-sm" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'today', label: 'Hari Ini' },
                  { key: 'tomorrow', label: 'Besok' },
                ].map(f => (
                  <Button key={f.key} size="sm"
                    variant={dateFilter === f.key ? 'default' : 'outline'}
                    onClick={() => {
                      setDateFilter(f.key as any)
                      const d = new Date()
                      if (f.key === 'tomorrow') d.setDate(d.getDate() + 1)
                      const str = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`
                      setSelectedDate(str)
                      setSpecificDate('')
                    }}
                    className="bg-white text-slate-700 border-slate-200 hover:bg-slate-100 h-9">
                    {f.label}
                  </Button>
                ))}
                <Input type="date" value={specificDate}
                  onChange={e => { setSpecificDate(e.target.value); if (e.target.value) { setDateFilter('specific'); setSelectedDate(e.target.value) } else setDateFilter('today') }}
                  className={`h-9 px-3 text-sm bg-white border-slate-200 ${dateFilter === 'specific' ? 'border-slate-800 ring-1 ring-slate-800' : ''}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Konten agenda */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-[15px] font-semibold text-slate-700 flex items-center gap-2">
              <CalendarDays size={16} className="text-slate-800" />
              {formatTanggalPanjang(activeDateStr)}
              {activeDateStr === todayStr && (
                <Badge className="bg-[#0f172a] text-white border-none text-[11px] px-2.5 py-0.5 rounded-full">Hari Ini</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-14 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">
                  {searchTerm ? 'Tidak ada kegiatan yang cocok' : 'Tidak ada agenda'}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {activeDateStr === todayStr ? 'Belum ada agenda hari ini' : 'Tidak ada agenda pada tanggal ini'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                    <div className="p-4 flex flex-col gap-2">
                      {/* Jam + Nama Acara */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
                            <Clock size={12} className="text-slate-600" />
                            <span className="text-[13px] font-bold text-slate-800">{entry.jam}</span>
                          </div>
                          <h3 className="font-bold text-[14px] text-slate-800 leading-snug">{entry.acara}</h3>
                        </div>
                        {entry.keterangan && (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium rounded-full px-2.5 shrink-0">
                            {entry.keterangan}
                          </Badge>
                        )}
                      </div>

                      {/* Tempat */}
                      {entry.tempat && (
                        <div className="flex items-center gap-2 text-[13px] text-slate-500">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span>{entry.tempat}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default Agenda