import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { useNavigate } from "react-router";
const Home = () => {
  const navigate = useNavigate()
   const user = useSelector((state: RootState) => state.auth.user);

   if(user?.isSuperAdmin && user.roleId == null){
      navigate("/onboarding")
    }
  return (
    <div>Home</div>
  )
}

export default Home