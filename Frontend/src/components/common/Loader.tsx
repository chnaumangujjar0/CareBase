import React from "react";
import { Spinner } from "react-bootstrap";

interface LoaderProps {
  isLoading: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 vh-100 d-flex flex-column align-items-center justify-content-center bg-light bg-opacity-75"
      style={{ 
        zIndex: 1060, 
        backdropFilter: "blur(2px)" 
      }}
    >
      <Spinner 
        animation="border" 
        variant="primary" 
        style={{ width: "2.5rem", height: "2.5rem" }} 
      />
      <h5 className="mt-3 text-primary fw-semibold tracking-wide">
        Loading...
      </h5>
    </div>
  );
};

export default Loader;