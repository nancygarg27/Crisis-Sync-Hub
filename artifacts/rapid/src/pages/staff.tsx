import { useState } from "react";
import { 
  useListIncidents,
  useListStaff, 
  useUpdateIncidentStatus,
  getListIncidentsQueryKey,
  getGetIncidentQueryKey,
  type Incident,
  type StaffMember
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSeverityColors, getCategoryIcon } from "@/lib/severity";
import { formatDistanceToNow } from "date-fns";

export function StaffPage() {
  const queryClient = useQueryClient();
  const { data: incidents = [], isLoading: incidentsLoading } = useListIncidents({ query: { queryKey: getListIncidentsQueryKey(), refetchInterval: 3000 } });
  const { data: staffList = [] } = useListStaff();
  const updateStatusMutation = useUpdateIncidentStatus();

  const [filter, setFilter] = useState<"All" | "Active" | "Critical" | "Resolved">("Active");
  
  // Dispatch Dialog State
  const [dispatchIncidentId, setDispatchIncidentId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [etaMinutes, setEtaMinutes] = useState<string>("5");
  
  // Resolve Dialog State
  const [resolveIncidentId, setResolveIncidentId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState<string>("");

  const activeIncidents = incidents.filter(i => i.status !== "resolved");
  const criticalCount = activeIncidents.filter(i => i.classification.severity === "Critical").length;

  const filteredIncidents = incidents.filter(inc => {
    if (filter === "Active") return inc.status !== "resolved";
    if (filter === "Critical") return inc.classification.severity === "Critical" && inc.status !== "resolved";
    if (filter === "Resolved") return inc.status === "resolved";
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleDispatch = () => {
    if (!dispatchIncidentId || !selectedStaffId) return;
    
    const etaSeconds = parseInt(etaMinutes) * 60;
    
    updateStatusMutation.mutate({
      id: dispatchIncidentId,
      data: {
        status: "staff_dispatched",
        staffId: selectedStaffId,
        etaSeconds: isNaN(etaSeconds) ? undefined : etaSeconds
      }
    }, {
      onSuccess: () => {
        setDispatchIncidentId(null);
        setSelectedStaffId("");
        queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetIncidentQueryKey(dispatchIncidentId) });
      }
    });
  };

  const handleMarkEnRoute = (id: string) => {
    updateStatusMutation.mutate({
      id,
      data: { status: "en_route" }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetIncidentQueryKey(id) });
      }
    });
  };

  const handleResolve = () => {
    if (!resolveIncidentId) return;
    
    updateStatusMutation.mutate({
      id: resolveIncidentId,
      data: {
        status: "resolved",
        note: resolveNote
      }
    }, {
      onSuccess: () => {
        setResolveIncidentId(null);
        setResolveNote("");
        queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetIncidentQueryKey(resolveIncidentId) });
      }
    });
  };

  // Flatten timeline for log
  const timelineLogs = incidents.flatMap(inc => 
    inc.timeline.map(t => ({
      ...t,
      incidentId: inc.id,
      roomLabel: inc.roomLabel,
    }))
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeIncidents.length}</div>
          </CardContent>
        </Card>
        <Card className={criticalCount > 0 ? "border-destructive bg-destructive/5" : ""}>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${criticalCount > 0 ? "text-destructive" : ""}`}>{criticalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{staffList.filter(s => s.available).length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Feed */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {(["All", "Active", "Critical", "Resolved"] as const).map(f => (
              <Badge 
                key={f} 
                variant={filter === f ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilter(f)}
              >
                {f}
              </Badge>
            ))}
          </div>

          {incidentsLoading && <div className="text-center py-12 animate-pulse">Loading incidents...</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIncidents.map(inc => {
              const Icon = getCategoryIcon(inc.classification.category);
              const isCritical = inc.classification.severity === "Critical";
              const timeAgo = formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true });
              const isResolved = inc.status === "resolved";
              
              return (
                <Card key={inc.id} className={`flex flex-col ${isResolved ? 'opacity-70' : ''}`}>
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getSeverityColors(inc.classification.severity)}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold">{inc.roomLabel}</h3>
                          <p className="text-xs text-muted-foreground">{timeAgo} • {inc.source}</p>
                        </div>
                      </div>
                      <Badge className={`${getSeverityColors(inc.classification.severity)} ${isCritical && !isResolved ? 'animate-pulse' : ''}`}>
                        {inc.classification.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-4 flex-1">
                    <div className="space-y-3">
                      <p className="text-sm">{inc.classification.translatedSummary}</p>
                      
                      <div className="flex flex-wrap gap-1">
                        {inc.classification.keywords.slice(0, 3).map(k => (
                          <Badge key={k} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {k}
                          </Badge>
                        ))}
                      </div>

                      <div className="bg-muted p-2 rounded text-xs">
                        <span className="font-semibold">Requires:</span> {inc.classification.callService}
                      </div>

                      <div className="flex items-center gap-2 text-sm pt-2">
                        <span className="font-medium text-muted-foreground">Status:</span>
                        <span className="capitalize">{inc.status.replace("_", " ")}</span>
                        {inc.assignedStaffId && (
                          <span className="text-xs ml-auto">
                            Staff: {staffList.find(s => s.id === inc.assignedStaffId)?.name || 'Unknown'}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-4 px-4 mt-auto border-t border-border/50 bg-card/50">
                    <div className="w-full flex gap-2 mt-4">
                      {inc.status === "alert_received" && (
                        <Button className="w-full" onClick={() => setDispatchIncidentId(inc.id)}>Dispatch Staff</Button>
                      )}
                      {inc.status === "staff_dispatched" && (
                        <Button className="w-full" variant="outline" onClick={() => handleMarkEnRoute(inc.id)}>Mark En Route</Button>
                      )}
                      {inc.status === "en_route" && (
                        <Button className="w-full" variant="default" onClick={() => setResolveIncidentId(inc.id)}>Mark Resolved</Button>
                      )}
                      {inc.status === "resolved" && (
                        <Button className="w-full" variant="secondary" disabled>Resolved</Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
            
            {filteredIncidents.length === 0 && !incidentsLoading && (
              <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                No incidents found.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Staff Availability</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {staffList.map(staff => (
                  <div key={staff.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-sm">{staff.name}</p>
                      <p className="text-xs text-muted-foreground">{staff.role} • {staff.location}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${staff.available ? 'bg-green-500' : 'bg-muted'}`} title={staff.available ? 'Available' : 'Busy'} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log */}
      <Card>
        <CardHeader>
          <CardTitle>System Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[400px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timelineLogs.map((log, i) => (
                  <TableRow key={`${log.incidentId}-${log.status}-${i}`}>
                    <TableCell className="whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                    <TableCell>{log.roomLabel}</TableCell>
                    <TableCell className="capitalize">{log.status.replace("_", " ")}</TableCell>
                    <TableCell>{log.staffName || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={log.note}>{log.note || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dispatch Dialog */}
      <Dialog open={!!dispatchIncidentId} onOpenChange={(open) => !open && setDispatchIncidentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispatch Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assign Staff Member</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.id} value={s.id} disabled={!s.available}>
                      {s.name} ({s.role}) {s.available ? '' : '- Busy'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estimated Arrival (minutes)</Label>
              <Input 
                type="number" 
                min="1" 
                value={etaMinutes} 
                onChange={e => setEtaMinutes(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchIncidentId(null)}>Cancel</Button>
            <Button onClick={handleDispatch} disabled={!selectedStaffId || updateStatusMutation.isPending}>Dispatch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveIncidentId} onOpenChange={(open) => !open && setResolveIncidentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Resolution Note (Optional)</Label>
              <Input 
                placeholder="E.g. Fire extinguished, guest safe" 
                value={resolveNote} 
                onChange={e => setResolveNote(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveIncidentId(null)}>Cancel</Button>
            <Button onClick={handleResolve} disabled={updateStatusMutation.isPending}>Confirm Resolution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
