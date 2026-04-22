import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetFloorMap, 
  useClassifyIncident, 
  useCreateIncident, 
  useCreateSilentSos,
  getListIncidentsQueryKey,
  type Classification,
  type IncidentSource
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, Mic, Send, AlertTriangle, MapPin, Pencil } from "lucide-react";
import { getSeverityColors } from "@/lib/severity";

export function GuestPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: floorMap } = useGetFloorMap();
  
  const classifyMutation = useClassifyIncident();
  const createIncidentMutation = useCreateIncident();
  const silentSosMutation = useCreateSilentSos();

  const [guestName, setGuestName] = useState("");
  const [roomId, setRoomId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [locationAuto, setLocationAuto] = useState(true);
  const [editLocation, setEditLocation] = useState(false);

  // Auto-detect location: prefer ?room=ID query param (e.g. from a QR code in
  // each room), otherwise fall back to a sensible default.
  useEffect(() => {
    if (!floorMap || roomId) return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("room");
    const allRooms = floorMap.floors.flatMap(f => f.rooms);
    if (fromUrl && allRooms.some(r => r.id === fromUrl)) {
      setRoomId(fromUrl);
      setLocationAuto(true);
      return;
    }
    const firstGuestRoom = allRooms.find(r => r.type === "guest_room");
    if (firstGuestRoom) {
      setRoomId(firstGuestRoom.id);
      setLocationAuto(true);
    }
  }, [floorMap, roomId]);

  const currentRoom = floorMap?.floors
    .flatMap(f => f.rooms.map(r => ({ ...r, floorLabel: f.label })))
    .find(r => r.id === roomId);

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  
  useEffect(() => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      setVoiceSupported(false);
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onstart = () => {
        setIsRecording(true);
      };
      
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentTranscript += event.results[i][0].transcript;
          }
        }
        if (currentTranscript) {
          setMessage(prev => prev ? prev + " " + currentTranscript : currentTranscript);
        }
      };
      
      recognition.onerror = () => {
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognition.start();
    }
  };

  // Camera
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const openCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
        
        classifyMutation.mutate({ data: { imageBase64: base64 } });
        setSource("image");
      }
    }
    closeCamera();
  };

  // Flow
  const [classification, setClassification] = useState<Classification | null>(null);
  const [source, setSource] = useState<IncidentSource>("text");

  const analyzeMessage = () => {
    if (!message) return;
    setSource(isRecording ? "voice" : "text");
    classifyMutation.mutate({ data: { message } }, {
      onSuccess: (data) => {
        setClassification(data);
      }
    });
  };

  const confirmAndSend = () => {
    if (!roomId || !classification) return;
    createIncidentMutation.mutate({ 
      data: {
        roomId,
        source,
        classification,
        guestName,
        message
      }
    }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
        setLocation(`/alert/${data.id}`);
      }
    });
  };

  // Silent SOS
  const [sosProgress, setSosProgress] = useState(0);
  const sosTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sosIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startSos = useCallback(() => {
    setSosProgress(0);
    const startTime = Date.now();
    
    sosIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / 3000) * 100, 100);
      setSosProgress(progress);
    }, 50);

    sosTimeoutRef.current = setTimeout(() => {
      stopSos();
      if (!roomId) return; // Fallback
      silentSosMutation.mutate({ data: { roomId, guestName } }, {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
          setLocation(`/alert/${data.id}`);
        }
      });
    }, 3000);
  }, [roomId, guestName, silentSosMutation, queryClient, setLocation]);

  const stopSos = useCallback(() => {
    if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
    if (sosTimeoutRef.current) clearTimeout(sosTimeoutRef.current);
    setSosProgress(0);
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Emergency</CardTitle>
          <CardDescription>Tell us what's happening. AI will analyze and dispatch help immediately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Location</Label>
            {!editLocation && currentRoom ? (
              <div className="flex items-center justify-between gap-2 p-3 rounded-md border bg-muted/40">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{currentRoom.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {currentRoom.floorLabel} {locationAuto && "· Auto-detected"}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => setEditLocation(true)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Change
                </Button>
              </div>
            ) : (
              <Select
                value={roomId}
                onValueChange={(v) => {
                  setRoomId(v);
                  setLocationAuto(false);
                  setEditLocation(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {floorMap?.floors.map(floor => (
                    <SelectGroup key={floor.id}>
                      <SelectLabel>{floor.label}</SelectLabel>
                      {floor.rooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>{room.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Your Name (Optional)</Label>
            <Input id="name" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="John Doe" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Describe the situation</Label>
            <Textarea 
              id="message" 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="E.g. There is a fire in the hallway..." 
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant={isRecording ? "destructive" : "secondary"} 
              className="flex-1" 
              onClick={toggleRecording}
              disabled={!voiceSupported}
              title={!voiceSupported ? "Voice not supported in this browser" : undefined}
            >
              <Mic className={`w-4 h-4 mr-2 ${isRecording ? 'animate-pulse' : ''}`} />
              {isRecording ? "Stop" : "Voice"}
            </Button>
            
            <Button type="button" variant="secondary" className="flex-1" onClick={openCamera}>
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </Button>
            
            <Button type="button" onClick={analyzeMessage} disabled={!message || classifyMutation.isPending} className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              Analyze
            </Button>
          </div>

          {classifyMutation.isPending && (
            <div className="text-center text-sm text-muted-foreground animate-pulse py-4">
              Analyzing situation...
            </div>
          )}

          {classification && (
            <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-4 border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge className={getSeverityColors(classification.severity)}>
                  {classification.severity} - {classification.category}
                </Badge>
                {classification.languageCode !== 'en' && (
                  <Badge variant="outline">Detected: {classification.detectedLanguage}</Badge>
                )}
              </div>
              
              <p className="text-sm font-medium">Service needed: {classification.callService}</p>
              
              {classification.instructions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Instructions:</p>
                  <ul className="text-sm space-y-1 list-disc pl-4 text-muted-foreground">
                    {classification.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <Button onClick={confirmAndSend} className="w-full mt-2" size="lg" disabled={createIncidentMutation.isPending}>
                {createIncidentMutation.isPending ? "Sending..." : "Confirm & Send Alert"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/20 bg-destructive/5 overflow-hidden">
        <CardContent className="p-6 text-center space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-destructive flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Silent SOS
            </h3>
            <p className="text-sm text-muted-foreground">Press and hold for 3 seconds to send a silent panic alert.</p>
          </div>
          
          <div className="relative w-32 h-32 mx-auto">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted" />
              <circle 
                cx="64" cy="64" r="60" 
                stroke="currentColor" 
                strokeWidth="8" 
                fill="transparent" 
                strokeDasharray={377} 
                strokeDashoffset={377 - (377 * sosProgress) / 100}
                className="text-destructive transition-all duration-75" 
              />
            </svg>
            <button
              onPointerDown={startSos}
              onPointerUp={stopSos}
              onPointerCancel={stopSos}
              onPointerLeave={stopSos}
              className="absolute inset-0 flex items-center justify-center w-full h-full rounded-full active:scale-95 transition-transform"
              aria-label="Hold for SOS"
            >
              <div className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground font-bold shadow-lg">
                SOS
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCameraOpen} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Capture Situation</DialogTitle>
            <DialogDescription>Take a clear photo of the emergency for AI analysis.</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-[3/4] bg-black rounded-md overflow-hidden flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={closeCamera}>Cancel</Button>
            <Button onClick={captureImage}>Capture & Analyze</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
