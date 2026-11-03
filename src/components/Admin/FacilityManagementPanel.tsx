// src/components/Admin/FacilityManagementPanel.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, Edit, Trash2, X, Users, Monitor, Mic, Cable, Plug, Projector, Wifi, ChevronDown, ChevronUp } from "lucide-react";
import { useFacilities, Facility, FacilityItem } from "@/hooks/useFacilities";

const ICON_OPTIONS = [
  { value: 'Users', label: 'Kapasitas / Orang' },
  { value: 'Monitor', label: 'Layar / Monitor' },
  { value: 'Projector', label: 'Proyektor' },
  { value: 'Mic', label: 'Mikrofon / Audio' },
  { value: 'Cable', label: 'Kabel / Konektivitas' },
  { value: 'Plug', label: 'Listrik / Stop Kontak' },
  { value: 'Wifi', label: 'WiFi / Internet' },
];

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Users, Monitor, Projector, Mic, Cable, Plug, Wifi,
};

const emptyItem = (): FacilityItem => ({ icon: 'Monitor', label: '', value: '' });
const emptyFacility = () => ({ room_name: '', capacity_min: 0, capacity_max: 0, items: [emptyItem()] });

const FacilityItemEditor = ({ item, index, onChange, onRemove }: {
  item: FacilityItem;
  index: number;
  onChange: (i: number, updated: FacilityItem) => void;
  onRemove: (i: number) => void;
}) => (
  <div className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg border border-slate-200">
    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Select value={item.icon} onValueChange={v => onChange(index, { ...item, icon: v })}>
        <SelectTrigger className="bg-white text-xs h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ICON_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input placeholder="Label (cth: Kapasitas)" value={item.label} onChange={e => onChange(index, { ...item, label: e.target.value })} className="bg-white text-xs h-9" />
      <Input placeholder="Nilai (cth: 25 Orang)" value={item.value} onChange={e => onChange(index, { ...item, value: e.target.value })} className="bg-white text-xs h-9" />
    </div>
    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-500 shrink-0" onClick={() => onRemove(index)}>
      <X size={14} />
    </Button>
  </div>
);

const FacilityFormContent = ({ data, onChange }: {
  data: { room_name: string; capacity_min: number; capacity_max: number; items: FacilityItem[] };
  onChange: (d: any) => void;
}) => {
  const updateItem = (i: number, updated: FacilityItem) => {
    const items = [...data.items];
    items[i] = updated;
    onChange({ ...data, items });
  };
  const removeItem = (i: number) => onChange({ ...data, items: data.items.filter((_, idx) => idx !== i) });
  const addItem = () => onChange({ ...data, items: [...data.items, emptyItem()] });

  return (
    <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
      <div className="space-y-1.5">
        <Label>Nama Ruangan</Label>
        <Input placeholder="cth: Lantai 1 - Aula Mini" value={data.room_name} onChange={e => onChange({ ...data, room_name: e.target.value })} className="bg-slate-50" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Kapasitas Min (orang)</Label>
          <Input type="number" min={0} value={data.capacity_min} onChange={e => onChange({ ...data, capacity_min: parseInt(e.target.value) || 0 })} className="bg-slate-50" />
        </div>
        <div className="space-y-1.5">
          <Label>Kapasitas Max (orang)</Label>
          <Input type="number" min={0} value={data.capacity_max} onChange={e => onChange({ ...data, capacity_max: parseInt(e.target.value) || 0 })} className="bg-slate-50" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Detail Fasilitas</Label>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addItem}>
            <Plus size={12} /> Tambah Item
          </Button>
        </div>
        <div className="space-y-2">
          {data.items.map((item, i) => (
            <FacilityItemEditor key={i} item={item} index={i} onChange={updateItem} onRemove={removeItem} />
          ))}
          {data.items.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-4 border border-dashed rounded-lg">Belum ada item fasilitas. Klik "+ Tambah Item".</p>
          )}
        </div>
      </div>
    </div>
  );
};

const FacilityManagementPanel = () => {
  const { facilities, isLoading, addFacility, updateFacility, deleteFacility } = useFacilities();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Facility | null>(null);
  const [addForm, setAddForm] = useState(emptyFacility());
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!addForm.room_name) return;
    setIsSaving(true);
    const ok = await addFacility(addForm);
    setIsSaving(false);
    if (ok) { setIsAddOpen(false); setAddForm(emptyFacility()); }
  };

  const openEdit = (f: Facility) => {
    setEditTarget(f);
    setEditForm({ room_name: f.room_name, capacity_min: f.capacity_min, capacity_max: f.capacity_max, items: [...f.items] });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    const ok = await updateFacility(editTarget.id, editForm);
    setIsSaving(false);
    if (ok) { setIsEditOpen(false); setEditTarget(null); }
  };

  return (
    <Card className="shadow-government border-none bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Building2 size={20} /> Manajemen Fasilitas Ruangan
            </CardTitle>
            <CardDescription>Kelola informasi fasilitas yang tampil di pop-up "Fasilitas Ruangan"</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setAddForm(emptyFacility()); setIsAddOpen(true); }} className="bg-primary hover:bg-primary/90 text-white gap-1.5">
            <Plus size={16} /> Tambah Ruangan
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-3">
            {facilities.map(f => {
              const IconMap = ICON_MAP;
              const isExpanded = expandedId === f.id;
              return (
                <div key={f.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Header Card Ruangan */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <button className="flex items-center gap-3 flex-1 text-left" onClick={() => setExpandedId(isExpanded ? null : f.id)}>
                      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-[14px]">{f.room_name}</p>
                        <p className="text-[12px] text-slate-400">Kapasitas: {f.capacity_min}–{f.capacity_max} orang · {f.items.length} fasilitas</p>
                      </div>
                      <span className="ml-auto mr-3 text-slate-400">
                        {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      </span>
                    </button>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(f)}>
                        <Edit size={14} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={14} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus ruangan '{f.room_name}'?</AlertDialogTitle>
                            <AlertDialogDescription>Data fasilitas ini akan dihapus permanen.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteFacility(f.id)} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Expanded Detail Fasilitas */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4">
                      <ul className="space-y-2">
                        {f.items.map((item, i) => {
                          const IconComp = IconMap[item.icon] || Monitor;
                          return (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <IconComp size={14} className="text-blue-400 mt-0.5 shrink-0" />
                              <span><strong>{item.label}:</strong> {item.value}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
            {facilities.length === 0 && (
              <div className="text-center py-10 text-slate-400 border border-dashed rounded-xl">
                <Building2 size={36} className="mx-auto mb-3 opacity-30" />
                <p>Belum ada data fasilitas ruangan.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* ===== MODAL TAMBAH RUANGAN ===== */}
      <AlertDialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <AlertDialogContent className="sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary"><Plus size={18}/> Tambah Ruangan Baru</AlertDialogTitle>
            <AlertDialogDescription>Tambahkan ruangan beserta detail fasilitasnya.</AlertDialogDescription>
          </AlertDialogHeader>
          <FacilityFormContent data={addForm} onChange={setAddForm} />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button onClick={handleAdd} disabled={isSaving || !addForm.room_name} className="bg-primary hover:bg-primary/90 text-white">
              {isSaving ? "Menyimpan..." : "Simpan Ruangan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== MODAL EDIT RUANGAN ===== */}
      <AlertDialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <AlertDialogContent className="sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary"><Edit size={18}/> Edit Fasilitas Ruangan</AlertDialogTitle>
            <AlertDialogDescription>Perbarui data fasilitas '{editTarget?.room_name}'.</AlertDialogDescription>
          </AlertDialogHeader>
          <FacilityFormContent data={editForm} onChange={setEditForm} />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button onClick={handleEdit} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default FacilityManagementPanel;