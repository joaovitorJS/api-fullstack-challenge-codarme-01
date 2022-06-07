import { app } from "./setup";

const PORT = 3030;

app.listen(process.env.PORT || PORT, () => console.log('[API] Server is running!'));