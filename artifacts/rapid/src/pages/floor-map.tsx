import { useState } from "react";
import { useGetFloorMap, useListIncidents, getListIncidentsQueryKey, type Incident } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { getSeverityColors, getCategoryIcon } from "@/lib/severity";

export function FloorMapPage() {
  const { data: floorMap, isLoading: mapLoading } = useGetFloorMap();
  const { data: incidents, isLoading: incidentsLoading } = useListIncidents({
    query: { queryKey: getListIncidentsQueryKey(), refetchInterval: 5000 }
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  if (mapLoading || incidentsLoading) {
    return <div className="p-8 text-center animate-pulse">Loading Map...</div>;
  }

  if (!floorMap) return null;

  const activeIncidents = (incidents || []).filter(inc => inc.status !== "resolved");

  const getRoomIncidents = (roomId: string) => {
    return activeIncidents.filter(inc => inc.roomId === roomId);
  };

  const getSeverityScore = (severity: string) => {
    switch (severity) {
      case "Critical": return 4;
      case "High": return 3;
      case "Medium": return 2;
      case "Low": return 1;
      default: return 0;
    }
  };

  const selectedIncident = selectedRoomId 
    ? activeIncidents.find(inc => inc.roomId === selectedRoomId) 
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facility Map</h1>
        <p className="text-muted-foreground">{floorMap.venueName}</p>
      </div>

      <Tabs defaultValue={floorMap.floors[0]?.id}>
        <div className="overflow-x-auto pb-2">
          <TabsList>
            {floorMap.floors.map(floor => (
              <TabsTrigger key={floor.id} value={floor.id}>
                {floor.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {floorMap.floors.map(floor => (
          <TabsContent key={floor.id} value={floor.id} className="mt-4">
            <Card className="p-4 bg-muted/30">
              <div className="relative w-full aspect-[16/10] bg-card border rounded-lg overflow-hidden">
                {/* A simplified map background or grid could go here */}
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.2 }} />

                {floor.rooms.map(room => {
                  const roomIncidents = getRoomIncidents(room.id);
                  const hasIncident = roomIncidents.length > 0;
                  
                  // Find highest severity
                  const highestIncident = roomIncidents.sort((a, b) => 
                    getSeverityScore(b.classification.severity) - getSeverityScore(a.classification.severity)
                  )[0];

                  let glowClass = "";
                  let borderClass = "border-border";
                  let bgClass = "bg-background";
                  let pulseClass = "";

                  if (highestIncident) {
                    const severity = highestIncident.classification.severity;
                    if (severity === "Critical") {
                      glowClass = "shadow-[0_0_20px_rgba(239,68,68,0.6)]";
                      borderClass = "border-destructive";
                      bgClass = "bg-destructive/20 text-destructive-foreground";
                      pulseClass = "animate-pulse";
                    } else if (severity === "High") {
                      glowClass = "shadow-[0_0_15px_rgba(249,115,22,0.5)]";
                      borderClass = "border-orange-500";
                      bgClass = "bg-orange-500/20 text-orange-500";
                    } else if (severity === "Medium") {
                      glowClass = "shadow-[0_0_10px_rgba(234,179,8,0.4)]";
                      borderClass = "border-yellow-500";
                      bgClass = "bg-yellow-500/20 text-yellow-500";
                    } else {
                      glowClass = "shadow-[0_0_5px_rgba(59,130,246,0.3)]";
                      borderClass = "border-blue-500";
                      bgClass = "bg-blue-500/20 text-blue-500";
                    }
                  }

                  return (
                    <div
                      key={room.id}
                      onClick={() => hasIncident && setSelectedRoomId(room.id)}
                      className={`absolute border rounded-md flex items-center justify-center text-[11px] font-medium cursor-pointer transition-all hover:scale-[1.02] hover:z-10
                        ${borderClass} ${bgClass} ${glowClass} ${pulseClass}
                      `}
                      style={{
                        left: `calc(${room.x}% + 2px)`,
                        top: `calc(${room.y}% + 2px)`,
                        width: `calc(${room.width}% - 4px)`,
                        height: `calc(${room.height}% - 4px)`,
                      }}
                      title={`${room.label} (${room.type})`}
                    >
                      <div className="px-1.5 py-0.5 rounded bg-background/85 backdrop-blur-sm truncate max-w-[92%] text-foreground leading-tight text-center">
                        {room.label}
                      </div>
                      {hasIncident && highestIncident && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shadow-md bg-destructive">
                          !
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Sheet open={!!selectedRoomId} onOpenChange={(open) => !open && setSelectedRoomId(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Room Details</SheetTitle>
            <SheetDescription>Active incidents in this location</SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {selectedIncident ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getSeverityColors(selectedIncident.classification.severity)}>
                    {selectedIncident.classification.severity}
                  </Badge>
                  <Badge variant="outline">{selectedIncident.status.replace("_", " ")}</Badge>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-1">Category</h4>
                  <p className="text-sm">{selectedIncident.classification.category}</p>
                </div>
                
                {selectedIncident.message && (
                  <div>
                    <h4 className="font-semibold mb-1">Original Message</h4>
                    <p className="text-sm text-muted-foreground p-3 rounded-md bg-muted italic">"{selectedIncident.message}"</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-1">AI Summary</h4>
                  <p className="text-sm">{selectedIncident.classification.translatedSummary}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Required Services</h4>
                  <p className="text-sm">{selectedIncident.classification.callService}</p>
                </div>
                
                <div className="text-xs text-muted-foreground pt-4 border-t">
                  Reported at {new Date(selectedIncident.createdAt).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-12">
                No active incidents in this room.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
