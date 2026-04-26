import {
  // Tech
  Smartphone, Laptop, Tablet, Headphones, Monitor, Gamepad2,
  Camera, Watch, Cpu, Printer, Wifi, CircuitBoard, Speaker,
  Battery, Usb, HardDrive, Mouse, Keyboard, Tv, Radio,

  // Home & Living
  Home, Sofa, Lamp, Bed,

  // Clothing & Fashion
  Shirt, ShoppingBag, Crown, Gem, Scissors,

  // Vehicles & Transport
  Car, Truck, Bike, Plane, Ship, Fuel, Wrench, Cog,

  // Sports & Outdoors
  Trophy, Mountain, Tent, Target,

  // Food & Drink
  Apple, Coffee, Pizza, Wine, UtensilsCrossed,

  // Health & Beauty
  Heart, Pill, Baby,

  // Education & Work
  BookOpen, GraduationCap, Briefcase, Calculator, Globe,

  // Real Estate
  Building, Building2, MapPin, Warehouse, Hotel, Factory, ParkingCircle,
  KeyRound, LandPlot, DoorOpen,

  // Nature
  Leaf, TreePine, Trees, Sprout, Snowflake,

  // Entertainment
  Music, Film, Mic, Gamepad, Ticket, Video, Play,

  // Tools & Services
  Hammer, Zap, Package, Gift, Star, Users,

  // Common UI icons used in project (verified working)
  Search, User, Store, Flag, Eye, Clock, Image, Send,
  Phone, Mail, Share2, MessageCircle, Shield, Edit2, Trash2,
  Plus, Settings, Wallet, Download, ExternalLink, Check,

  type LucideIcon,
} from "lucide-react";

export const iconMap: Record<string, LucideIcon> = {
  // Tech
  Smartphone, Laptop, Tablet, Headphones, Monitor, Gamepad2,
  Camera, Watch, Cpu, Printer, Wifi, CircuitBoard, Speaker,
  Battery, Usb, HardDrive, Mouse, Keyboard, Tv, Radio,

  // Home & Living
  Home, Sofa, Lamp, Bed,

  // Clothing & Fashion
  Shirt, ShoppingBag, Crown, Gem, Scissors,

  // Vehicles & Transport
  Car, Truck, Bike, Plane, Ship, Fuel, Wrench, Cog,

  // Sports & Outdoors
  Trophy, Mountain, Tent, Target,

  // Food & Drink
  Apple, Coffee, Pizza, Wine, UtensilsCrossed,

  // Health & Beauty
  Heart, Pill, Baby,

  // Education & Work
  BookOpen, GraduationCap, Briefcase, Calculator, Globe,

  // Real Estate
  Building, Building2, MapPin, Warehouse, Hotel, Factory, ParkingCircle,
  KeyRound, LandPlot, DoorOpen,

  // Nature
  Leaf, TreePine, Trees, Sprout, Snowflake,

  // Entertainment
  Music, Film, Mic, Gamepad, Ticket, Video, Play,

  // Tools & Services
  Hammer, Zap, Package, Gift, Star, Users,

  // Other
  Store, User, Phone, Mail, Settings, Wallet,
};

export const availableIconNames = Object.keys(iconMap);
