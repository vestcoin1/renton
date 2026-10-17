import { isPublic, PROPERTIES } from "renton-core/mock/properties";

export const listings = PROPERTIES.filter(isPublic).filter((property) => property.occupancy !== "occupied");