import { useRoute } from "wouter";
import { useGetIncident, getGetIncidentQueryKey, useListStaff } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, MapPin, User, AlertCircle } from "lucide-react";
import { getSeverityColors } from "@/lib/severity";
import { useEffect, useState } from "react";

export function AlertPage() {
  const [match, params] = useRoute("/alert/:id");
  const id = params?.id || "";

  const { data: incident, isLoading } = useGetIncident(id, {
    query: { 
      enabled: !!id, 
      queryKey: getGetIncidentQueryKey(id), 
      refetchInterval: 3000 
    }
  });

  const { data: staffList } = useListStaff();

  const assignedStaff = staffList?.find(s => s.id === incident?.assignedStaffId);

  // Status mapping
  const statusConfig = {
    alert_received: { label: "Alert Received", desc: "We're processing your alert.", color: "text-blue-500" },
    staff_dispatched: { label: "Staff Dispatched", desc: "Help has been assigned.", color: "text-orange-500" },
    en_route: { label: "En Route", desc: "Help is on the way.", color: "text-yellow-500" },
    resolved: { label: "Resolved", desc: "The situation is resolved.", color: "text-green-500" },
  };

  const steps = ["alert_received", "staff_dispatched", "en_route", "resolved"] as const;
  
  const currentStepIndex = incident ? steps.indexOf(incident.status) : 0;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground animate-pulse">Loading status...</div>;
  }

  if (!incident) {
    return <div className="text-center py-12 text-destructive">Alert not found</div>;
  }

  const currentConfig = statusConfig[incident.status];

  // Calculate ETA if provided
  let etaText = "Calculating...";
  if (incident.etaSeconds && incident.status !== "resolved") {
    const dispatchedEvent = incident.timeline.slice().reverse().find(t => t.status === "staff_dispatched");
    if (dispatchedEvent) {
      const dispatchedAt = new Date(dispatchedEvent.timestamp).getTime();
      const targetTime = dispatchedAt + (incident.etaSeconds * 1000);
      const now = Date.now();
      const remainingSecs = Math.max(0, Math.floor((targetTime - now) / 1000));
      
      if (remainingSecs > 60) {
        etaText = `~${Math.ceil(remainingSecs / 60)} minutes`;
      } else if (remainingSecs > 0) {
        etaText = `< 1 minute`;
      } else {
        etaText = `Arriving now`;
      }
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className={`p-6 rounded-xl border text-center ${incident.status === 'resolved' ? 'bg-green-500/10 border-green-500/20' : 'bg-card'}`}>
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${getSeverityColors(incident.classification.severity)}`}>
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">{currentConfig.label}</h1>
        <p className="text-muted-foreground text-lg">{currentConfig.desc}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative pl-6 border-l-2 border-border ml-4 space-y-8">
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStepIndex || (idx === currentStepIndex && step === "resolved");
              const isCurrent = idx === currentStepIndex && step !== "resolved";
              const isPending = idx > currentStepIndex;
              
              const timelineEvent = incident.timeline.slice().reverse().find(t => t.status === step);

              return (
                <div key={step} className={`relative ${isPending ? 'opacity-40' : 'opacity-100'} transition-opacity duration-500`} style={{ transitionDelay: `${idx * 150}ms` }}>
                  <div className={`absolute -left-[35px] w-6 h-6 rounded-full border-2 flex items-center justify-center bg-background
                    ${isCompleted ? 'border-primary text-primary' : isCurrent ? 'border-primary text-primary animate-pulse' : 'border-border text-transparent'}
                  `}>
                    {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">{statusConfig[step].label}</h4>
                    {timelineEvent && (
                      <div className="text-sm text-muted-foreground mt-1 space-y-1">
                        <p>{new Date(timelineEvent.timestamp).toLocaleTimeString()}</p>
                        {timelineEvent.note && <p className="italic">"{timelineEvent.note}"</p>}
                        {timelineEvent.staffName && <p className="text-xs">By {timelineEvent.staffName}</p>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {(incident.status === "staff_dispatched" || incident.status === "en_route") && assignedStaff && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{assignedStaff.name}</h4>
              <p className="text-sm text-muted-foreground">{assignedStaff.role}</p>
            </div>
            {incident.etaSeconds && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">ETA</p>
                <p className="font-mono font-bold text-lg text-primary">{etaText}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Situation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {incident.roomLabel}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge variant="outline">{incident.classification.category}</Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Instructions</p>
            <ul className="text-sm space-y-1 list-disc pl-4 text-foreground">
              {incident.classification.instructions.map((inst, i) => (
                <li key={i}>{inst}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
