import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import  '../../styles/unauthorized.scss';
import Logo from "../../assets/shield-lock-icon.svg"
const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="unauthorized-container">
      {/* The giant semi-transparent background number */}
      <div className="giant-background-text">403</div>
      
      <div className="content-wrapper">
        <img 
          src={Logo} 
          alt="Unauthorized" 
          className="floating-monster" 
        />

        <h1 className="error-title">Access Denied</h1>
        
        <p className="error-description">
          Sorry, you are unauthorized to access this page. <br/>
          For any query, feel free to ask system administration.
        </p>

        <button 
          className="back-button" 
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};

export default Unauthorized