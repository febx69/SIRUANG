import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo-pamekasan.png";

interface HeaderProps {
  user: {
    username: string;
    role: 'admin' | 'user';
  } | null;
  onLogout: () => void;
}

const Header = ({ user, onLogout }: HeaderProps) => {
  return (
    <header 
      className="bg-gradient-header shadow-government border-b border-primary/20 text-white animate-background-pan sticky top-0 z-50"
      style={{ backgroundSize: '200% 200%' }}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Bagian Kiri: Logo dan Judul */}
          <div className="flex flex-shrink-0 items-center space-x-3 min-w-0">
            <img 
              src={logoImage} 
              alt="Logo Kabupaten Pamekasan" 
              className="h-10 w-10 md:h-12 md:w-12 object-contain"
            />
            <div className="flex flex-col justify-center">
              {/* Judul untuk Mobile (<768px) */}
              <h1 className="text-lg font-bold tracking-tight leading-tight truncate md:hidden">
                Peminjaman Ruangan
              </h1>
              {/* Judul untuk Desktop (>=768px) */}
              <h1 className="hidden md:block text-xl font-bold tracking-tight">
                Sistem Informasi Reservasi Ruangan
              </h1>
              <p className="hidden sm:block text-xs md:text-sm text-white/90">
                Dinas Kesehatan Kabupaten Pamekasan
              </p>
            </div>
          </div>
          
          {/* Bagian Kanan: User dan Tombol Logout */}
          {user && (
            <div className="flex flex-shrink-0 items-center space-x-2 md:space-x-4">
              <div className="hidden sm:flex items-center space-x-2">
                <User size={18} />
                <div className="text-sm">
                  <p className="font-medium">{user.username}</p>
                  <p className="text-white/80 text-xs capitalize">{user.role}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onLogout}
                className="border-white/30 bg-white/20 text-white hover:bg-white/30 hover:text-white transition-all duration-300 transform hover:scale-105"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
