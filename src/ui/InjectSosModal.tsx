/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Inject SOS / Live Incident Simulator Modal
 * Lets operators test real-time agent entanglement by simulating incoming distress signals.
 */

import React, { useState } from 'react';
import { Sparkles, X, Send, Radio, Droplets, Flame, AlertCircle } from 'lucide-react';
import { MUMBAI_WARDS, MumbaiWard } from '../data/mumbaiZones.ts';
import { useWorldStore } from '../state/store.ts';
import { DisasterType } from '../state/types.ts';

interface InjectSosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InjectSosModal: React.FC<InjectSosModalProps> = ({ isOpen, onClose }) => {
  const { addCitizenReport, isKilled } = useWorldStore();

  const [wardId, setWardId] = useState('kurla');
  const [disasterType, setDisasterType] = useState<DisasterType>('flood');
  const [source, setSource] = useState<'whatsapp_bot' | 'control_room_ivr' | 'sensor_threshold' | 'social_verified'>('whatsapp_bot');
  const [locationName, setLocationName] = useState('Kranti Nagar, Mithi River Embankment');
  const [reportText, setReportText] = useState('Water level surging over 4 feet! 18 people trapped inside ground floor chawl near railway culvert, send rescue boats!');
  const [sensorCorroborated, setSensorCorroborated] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isKilled) return;

    addCitizenReport({
      wardId,
      disasterType,
      source,
      locationName,
      text: reportText,
      isVerified: sensorCorroborated,
      reporterContactMasked: '+91 98' + Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8),
      sensorCorroboration: {
        sensorId: `SENSOR-${wardId.toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`,
        sensorReading: disasterType === 'flood' ? 'Telemetry surge +85cm water height' : 'Wet bulb index: 32.4°C',
        isCorroborated: sensorCorroborated,
      },
      credibilityScore: sensorCorroborated ? 0.88 : 0.52,
    });

    onClose();
  };

  const loadPreset = (presetType: 'kurla_flood' | 'dharavi_heat' | 'dadar_pump') => {
    if (presetType === 'kurla_flood') {
      setWardId('kurla');
      setDisasterType('flood');
      setLocationName('Bail Bazar Nullah Overflow');
      setReportText('Rapid flood current carrying debris down Bail Bazar main road. Elderly residents need urgent evacuation.');
      setSensorCorroborated(true);
    } else if (presetType === 'dharavi_heat') {
      setWardId('dharavi');
      setDisasterType('heatwave');
      setLocationName('Kumbharwada 90-Ft Road');
      setReportText('Extreme indoor heat in tin-roof workshops. Multiple workers collapsed with severe dehydration and dizziness.');
      setSensorCorroborated(true);
    } else {
      setWardId('dadar');
      setDisasterType('flood');
      setLocationName('Hindmata TT Junction');
      setReportText('Submersible pump tripped! Water accumulating fast at flyover carriage road, cars beginning to float.');
      setSensorCorroborated(false);
    }
  };

  const wardsList: MumbaiWard[] = Object.values(MUMBAI_WARDS);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFDF8] border border-[#E4D9C5] rounded-[20px] p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E4D9C5]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#B0623A]" />
            <h2 className="text-base font-bold font-heading text-[#3A2E26]">
              Simulate Field Distress Signal (SOS)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#F2EBDD] text-[#7A6A5A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Demo Presets */}
        <div className="mb-4">
          <label className="block text-[11px] font-mono uppercase font-bold text-[#7A6A5A] mb-1.5">
            Quick Scenario Presets:
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => loadPreset('kurla_flood')}
              className="px-2.5 py-1 rounded-full text-xs bg-[#FAF6EE] border border-[#E4D9C5] text-[#3A2E26] hover:bg-[#F2EBDD] font-medium"
            >
              🌊 Kurla Mithi Flash Inundation
            </button>
            <button
              type="button"
              onClick={() => loadPreset('dharavi_heat')}
              className="px-2.5 py-1 rounded-full text-xs bg-[#FAF6EE] border border-[#E4D9C5] text-[#3A2E26] hover:bg-[#F2EBDD] font-medium"
            >
              ☀️ Dharavi Extreme Heat Outbreak
            </button>
            <button
              type="button"
              onClick={() => loadPreset('dadar_pump')}
              className="px-2.5 py-1 rounded-full text-xs bg-[#FAF6EE] border border-[#E4D9C5] text-[#3A2E26] hover:bg-[#F2EBDD] font-medium"
            >
              ⚠️ Dadar Hindmata Pump Outage
            </button>
          </div>
        </div>

        {/* Injection Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#3A2E26] mb-1">
                Target Mumbai Ward:
              </label>
              <select
                value={wardId}
                onChange={e => setWardId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E4D9C5] bg-[#FAF6EE] text-[#3A2E26] focus:outline-none"
              >
                {wardsList.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} (Ward {w.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#3A2E26] mb-1">
                Disaster Mode:
              </label>
              <select
                value={disasterType}
                onChange={e => setDisasterType(e.target.value as DisasterType)}
                className="w-full px-3 py-2 rounded-xl border border-[#E4D9C5] bg-[#FAF6EE] text-[#3A2E26] focus:outline-none"
              >
                <option value="flood">Monsoon Urban Flood</option>
                <option value="heatwave">Extreme Heatwave</option>
                <option value="compound">Compound Hazard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#3A2E26] mb-1">
                Distress Ingestion Channel:
              </label>
              <select
                value={source}
                onChange={e => setSource(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#E4D9C5] bg-[#FAF6EE] text-[#3A2E26] focus:outline-none"
              >
                <option value="whatsapp_bot">WhatsApp Citizen Bot</option>
                <option value="control_room_ivr">Disaster Control IVR 1916</option>
                <option value="sensor_threshold">IoT Telemetry Threshold</option>
                <option value="social_verified">Verified Civic Volunteer</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#3A2E26] mb-1">
                Specific Location:
              </label>
              <input
                type="text"
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E4D9C5] bg-[#FAF6EE] text-[#3A2E26] focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#3A2E26] mb-1">
              Field Report Text:
            </label>
            <textarea
              rows={3}
              value={reportText}
              onChange={e => setReportText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E4D9C5] bg-[#FAF6EE] text-[#3A2E26] focus:outline-none leading-relaxed"
              required
            />
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF6EE] border border-[#E4D9C5]">
            <input
              type="checkbox"
              id="sensorMatch"
              checked={sensorCorroborated}
              onChange={e => setSensorCorroborated(e.target.checked)}
              className="rounded text-[#5F7A61] focus:ring-0"
            />
            <label htmlFor="sensorMatch" className="text-xs text-[#3A2E26] font-medium cursor-pointer">
              Corroborated by Ward Hydro/Temp Telemetry Sensor (+25% credibility boost)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full font-semibold text-[#7A6A5A] hover:bg-[#F2EBDD]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isKilled}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full font-bold uppercase tracking-wider text-white bg-[#5F7A61] hover:bg-[#4D664F] transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ingest &amp; Trigger Entanglement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
