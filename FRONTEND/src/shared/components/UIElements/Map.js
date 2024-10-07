import React from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

import "./Map.css";

const Map = (props) => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: "AIzaSyAFgjGHtbDTbV5koCQ3XX9muxKiuRtAnzQ",
  });

  if (!isLoaded) return <div>Loading...</div>

  return (
      <GoogleMap
        mapContainerClassName="map"
        center={props.center}
        zoom={16}
      >
        <Marker position={props.center}></Marker>
      </GoogleMap>
  )
};

export default Map;
