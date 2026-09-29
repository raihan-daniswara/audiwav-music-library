import { motion } from "framer-motion";

export const HomeHeader = () => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
        {greeting}
      </h1>
    </motion.div>
  );
};
