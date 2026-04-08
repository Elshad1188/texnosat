import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

interface StoreFollowersTabProps {
  followers: any[];
  followerProfiles: any[];
}

const StoreFollowersTab = ({ followers, followerProfiles }: StoreFollowersTabProps) => {
  if (followers.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">Hələ abunəçiniz yoxdur</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1.5">
      {followers.map((f) => {
        const profile = followerProfiles.find((p: any) => p.user_id === f.user_id);
        return (
          <Card key={f.id}>
            <CardContent className="flex items-center gap-3 p-2.5">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-secondary text-xs font-bold">
                  {(profile?.full_name || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {profile?.full_name || "İstifadəçi"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {profile?.city && <span>{profile.city} · </span>}
                  {new Date(f.created_at).toLocaleDateString("az-AZ")}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StoreFollowersTab;
