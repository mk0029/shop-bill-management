import { Button } from "@/components/ui/button";
import { User, Camera } from "lucide-react";
import { SanityImage } from "@/components/ui/sanity-image";

interface ProfileHeaderProps {
  user: any;
  isEditing: boolean;
  imagePreview: string | null;
  onEditToggle: () => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProfileHeader = ({
  user,
  isEditing,
  imagePreview,
  onEditToggle,
  onImageChange,
}: ProfileHeaderProps) => {
  // Using SanityImage component for consistent image handling
  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            My Profile
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base max-sm:max-w-[80%]">
            Manage your account information and preferences
          </p>
        </div>
        <Button
          onClick={onEditToggle}
          variant={isEditing ? "outline" : "default"}
          className={
            isEditing ? "border-gray-600" : "bg-blue-600 hover:bg-blue-700"
          }>
          {isEditing ? "Cancel" : "Edit Profile"}
        </Button>
      </div>

      {/* Profile Image Section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center overflow-hidden">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <SanityImage
                src={user?.profileImage}
                alt={user?.name || 'Profile'}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                fallback={<User className="w-10 h-10 text-gray-400" />}
              />
            )}
          </div>

          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 rounded-full p-2 cursor-pointer transition-colors">
              <Camera className="w-4 h-4 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={onImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white">{user?.name}</h2>
          <p className="text-gray-400">{user?.phone}</p>
          <p className="text-gray-400 text-sm">{user?.location}</p>
        </div>
      </div>
    </div>
  );
};
