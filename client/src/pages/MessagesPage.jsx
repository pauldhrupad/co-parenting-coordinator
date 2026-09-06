import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MessageThread from "../components/messages/MessageThread";
import { ErrorNotice, Loading } from "../components/Notice";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [family, setFamily] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/family/me").then((data) => data.family ? setFamily(data.family) : navigate("/create-family", { replace: true })).catch((loadError) => setError(loadError.message));
  }, [navigate]);

  if (!family && !error) return <Loading/>;
  if (error) return <ErrorNotice message={error}/>;
  return <MessageThread family={family} user={user}/>;
}
