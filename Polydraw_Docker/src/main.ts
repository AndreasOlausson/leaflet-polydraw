import 'leaflet/dist/leaflet.css';
import 'leaflet-polydraw/dist/styles/polydraw.css';
import * as L from 'leaflet';
// @ts-ignore
import Polydraw from 'leaflet-polydraw';

const map = L.map('map').setView([58.402514, 15.606188], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

new Polydraw().addTo(map);
