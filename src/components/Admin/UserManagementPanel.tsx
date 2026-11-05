// src/components/Admin/UserManagementPanel.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Edit, Trash2, Eye, EyeOff, ShieldCheck, User, Building2, Sparkles } from "lucide-react";
import { useUserManagement, ManagedUser } from "@/hooks/useUserManagement";
import { Checkbox } from "@/components/ui/checkbox";

const roleConfig: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700 border-red-200', icon: ShieldCheck },
  bidang: { label: 'Bidang', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Building2 },
  puskesmas: { label: 'Puskesmas', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: Building2 },
  rsud: { label: 'RSUD', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: Building2 },
  dinsos: { label: 'Dinsos', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Building2 },
  dukcapil: { label: 'Dukcapil', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: ShieldCheck },
  pengurus_barang: { label: 'Pengurus Barang', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Building2 },
  ob: { label: 'Petugas OB', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Sparkles },
  user: { label: 'User', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: User },
};

const emptyForm = { username: '', password: '', role: 'bidang' as ManagedUser['role'], is_ob: false };

const UserManagementPanel = () => {
  const { users, isLoading, addUser, updateUser, deleteUser } = useUserManagement();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState<Partial<ManagedUser>>({});
  const [showPwd, setShowPwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.username || !form.password || !form.role) return;
    setIsSaving(true);
    const ok = await addUser(form);
    setIsSaving(false);
    if (ok) { setIsAddOpen(false); setForm(emptyForm); }
  };

  const openEdit = (u: ManagedUser) => {
    setEditTarget(u);
    setEditForm({ username: u.username, password: u.password, role: u.role, is_ob: Boolean(u.is_ob) });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    const ok = await updateUser(editTarget.id, editForm);
    setIsSaving(false);
    if (ok) { setIsEditOpen(false); setEditTarget(null); }
  };

  const handleDelete = async (id: string) => {
    await deleteUser(id);
  };

  return (
    <Card className="shadow-government border-none bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Users size={20} /> Manajemen Akun
            </CardTitle>
            <CardDescription>Kelola semua akun pengguna SIRUANG</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setForm(emptyForm); setIsAddOpen(true); }} className="bg-primary hover:bg-primary/90 text-white gap-1.5">
            <Plus size={16} /> Tambah Akun
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-2.5">
            {users.map((u) => {
              const rc = roleConfig[u.role] || roleConfig.user;
              const RoleIcon = rc.icon;
              return (
                <div key={u.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <RoleIcon size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-[14px]">{u.username}</p>
                      <p className="text-[12px] text-slate-400">
                        Dibuat: {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${rc.color} border font-medium text-[11px] px-2.5 py-0.5 rounded-full`}>
                      {rc.label}
                    </Badge>
                    {u.is_ob && u.role !== 'ob' && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles size={11} /> +OB
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(u)}>
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
                          <AlertDialogTitle>Hapus akun '{u.username}'?</AlertDialogTitle>
                          <AlertDialogDescription>Akun yang dihapus tidak dapat dikembalikan. Semua peminjaman terkait tetap ada di database.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(u.id)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
            {users.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <Users size={36} className="mx-auto mb-3 opacity-30" />
                <p>Belum ada akun terdaftar.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* ===== MODAL TAMBAH AKUN ===== */}
      <AlertDialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary"><Plus size={18}/> Tambah Akun Baru</AlertDialogTitle>
            <AlertDialogDescription>Isi form berikut untuk menambahkan akun pengguna SIRUANG.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input placeholder="contoh: bidang_kesmas" value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value.toLowerCase().replace(/\s/g, '_')}))} className="bg-slate-50" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input type={showPwd ? "text" : "password"} placeholder="Masukkan password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} className="bg-slate-50 pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role Utama</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({...p, role: v as ManagedUser['role']}))}>
                <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidang">Bidang (Akses Usulan Khusus Bidang Sendiri)</SelectItem>
                  <SelectItem value="puskesmas">Puskesmas (Pengusul PBPU BP)</SelectItem>
                  <SelectItem value="rsud">RSUD (Pengusul PBPU BP)</SelectItem>
                  <SelectItem value="dinsos">Dinas Sosial (Pengusul PBPU BP)</SelectItem>
                  <SelectItem value="dukcapil">Dukcapil (Verifikasi NIK)</SelectItem>
                  <SelectItem value="pengurus_barang">Pengurus Barang</SelectItem>
                  <SelectItem value="user">User (hanya lihat & input)</SelectItem>
                  <SelectItem value="ob">Petugas OB (fokus kebersihan)</SelectItem>
                  <SelectItem value="admin">Admin (akses penuh)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="add_is_ob"
                checked={form.is_ob || form.role === 'ob'}
                onCheckedChange={(c) => setForm(p => ({ ...p, is_ob: Boolean(c) }))}
              />
              <label htmlFor="add_is_ob" className="text-xs font-medium text-slate-700 cursor-pointer">
                Tugaskan juga sebagai Petugas Kebersihan (OB)
              </label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button onClick={handleAdd} disabled={isSaving || !form.username || !form.password} className="bg-primary hover:bg-primary/90 text-white">
              {isSaving ? "Menyimpan..." : "Simpan Akun"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== MODAL EDIT AKUN ===== */}
      <AlertDialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary"><Edit size={18}/> Edit Akun</AlertDialogTitle>
            <AlertDialogDescription>Perbarui data akun '{editTarget?.username}'.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={editForm.username || ''} onChange={e => setEditForm(p => ({...p, username: e.target.value}))} className="bg-slate-50" />
            </div>
            <div className="space-y-1.5">
              <Label>Password Baru <span className="text-slate-400 font-normal">(kosongkan jika tidak ganti)</span></Label>
              <div className="relative">
                <Input type={showEditPwd ? "text" : "password"} placeholder="Password baru..." value={editForm.password || ''} onChange={e => setEditForm(p => ({...p, password: e.target.value}))} className="bg-slate-50 pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowEditPwd(p => !p)}>
                  {showEditPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role Utama</Label>
              <Select value={editForm.role || 'user'} onValueChange={v => setEditForm(p => ({...p, role: v as ManagedUser['role']}))}>
                <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidang">Bidang (edit/hapus milik sendiri)</SelectItem>
                  <SelectItem value="puskesmas">Puskesmas (Pengusul PBPU BP)</SelectItem>
                  <SelectItem value="rsud">RSUD (Pengusul PBPU BP)</SelectItem>
                  <SelectItem value="dinsos">Dinas Sosial (Pengusul PBPU BP)</SelectItem>
                  <SelectItem value="dukcapil">Dukcapil (Verifikasi NIK)</SelectItem>
                  <SelectItem value="pengurus_barang">Pengurus Barang</SelectItem>
                  <SelectItem value="user">User (hanya lihat & input)</SelectItem>
                  <SelectItem value="ob">Petugas OB (fokus kebersihan)</SelectItem>
                  <SelectItem value="admin">Admin (akses penuh)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="edit_is_ob"
                checked={editForm.is_ob || editForm.role === 'ob'}
                onCheckedChange={(c) => setEditForm(p => ({ ...p, is_ob: Boolean(c) }))}
              />
              <label htmlFor="edit_is_ob" className="text-xs font-medium text-slate-700 cursor-pointer">
                Tugaskan juga sebagai Petugas Kebersihan (OB)
              </label>
            </div>
          </div>
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

export default UserManagementPanel;