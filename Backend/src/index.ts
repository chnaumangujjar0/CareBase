import dns from "node:dns"
dns.setServers(["8.8.8.8", "8.8.4.4"])

import 'dotenv/config';
import { app, httpServer } from "./app.js";
import { connectDB } from "./db/index.js"

connectDB().then(() => {
  httpServer.on("error", (err) => {
    console.log("Error : ", err)
    throw err
  })

  httpServer.listen(process.env.PORT || 8000, () => {
    console.log(
      `Server is Running On Port ${process.env.PORT}`
    );
  });

}).catch(err => console.log(err));