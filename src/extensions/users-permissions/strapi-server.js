module.exports = (plugin) => {
  // Override the default user update controller
  const originalUpdate = plugin.controllers.user.update;

  plugin.controllers.user.update = async (ctx) => {
    const { id } = ctx.params;
    const { board, standard, batch, ...otherData } = ctx.request.body;

    // Use Strapi Entity Service to update the user model including relations
    const updatedUser = await strapi.entityService.update(
      "plugin::users-permissions.user",
      id,
      {
        data: {
          ...otherData,
          ...(board !== undefined && { board }),
          ...(standard !== undefined && { standard }),
          ...(batch !== undefined && { batch }),
        },
        populate: ["board", "standard", "batch"],
      },
    );

    ctx.body = updatedUser;
  };

  return plugin;
};
