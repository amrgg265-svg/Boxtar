// ==========================================
// 1. تشغيل سيرفر الـ Keep-Alive
// ==========================================
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.status(200).send('Boxtar Bot is active! 🚀');
});

app.get('/ping', (req, res) => {
  res.status(200).send('PONG');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// ==========================================
// 2. كود بوت ديسكورد والميزات الكاملة
// ==========================================
const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');

const { createCanvas, loadImage } = require('@napi-rs/canvas');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const afkUsers = new Map();
const logChannels = new Map();
const ticketData = new Map();         
const ticketSettings = new Map();     
const applicationsData = new Map();
const customShortcuts = new Map();    
const commandRoles = new Map();        

const levelSettings = new Map();   
const userLevels = new Map();      
const levelRoles = new Map();      

const commands = [
  new SlashCommandBuilder()
    .setName('admin-setup')
    .setDescription('تحديد الرتب المصرح لها باستخدام الأوامر الإدارية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('shortcut')
    .setDescription('إنشاء اختصار مخصص لأحد الأوامر الإدارية')
    .addStringOption(opt => 
      opt.setName('الأمر_الأصلي')
        .setDescription('اختر الأمر المراد عمل اختصار له')
        .setRequired(true)
        .addChoices(
          { name: 'حظر (ban)', value: 'ban' },
          { name: 'طرد (kick)', value: 'kick' },
          { name: 'كتم مؤقت (timeout)', value: 'timeout' },
          { name: 'تحذير (warn)', value: 'warn' },
          { name: 'مسح رسائل (clear)', value: 'clear' },
          { name: 'قفل القناة (lock)', value: 'lock' },
          { name: 'فتح القناة (unlock)', value: 'unlock' }
        )
    )
    .addStringOption(opt => opt.setName('الاسم_المختصر').setDescription('اكتب الكلمة الاختصارية').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('تقديم').setDescription('إدارة وتخصيص لوحات التقديم الأربعة'),
  new SlashCommandBuilder().setName('ticket-setup').setDescription('تخصيص وإعداد لوحة الدعم والتذاكر'),
  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('إعداد وتحديد قنوات السجلات الخاصة والإجراءات والتذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('level-setup')
    .setDescription('إعداد وتخصيص نظام اللفلات، معادلة الـ XP، ورتب المكافآت')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('level')
    .setDescription('عرض بطاقة اللفل المصورة وإحصائيات الـ XP')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض لفله').setRequired(false)),

  new SlashCommandBuilder()
    .setName('afk')
    .setDescription('تفعيل وضع الغياب AFK')
    .addStringOption(opt => opt.setName('سبب').setDescription('سبب الغياب (اختياري)').setRequired(false)),
  new SlashCommandBuilder()
    .setName('bad-words')
    .setDescription('إدارة قائمة الكلمات المحظورة والعقوبات')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('حظر عضو من السيرفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد حظره').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الحظر').setRequired(true)),
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('طرد عضو من السيرفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد طرده').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الطرد').setRequired(true)),
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('كتم عضو مؤقتاً')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد كتمه').setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('المدة')
        .setDescription('حدد مدة الكتم')
        .setRequired(true)
        .addChoices(
          { name: '5 دقائق', value: 5 * 60 * 1000 },
          { name: '10 دقائق', value: 10 * 60 * 1000 },
          { name: '1 ساعة', value: 60 * 60 * 1000 },
          { name: '1 يوم', value: 24 * 60 * 60 * 1000 },
          { name: '1 أسبوع', value: 7 * 24 * 60 * 60 * 1000 }
        )
    )
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الكتم').setRequired(true)),
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('إرسال تحذير إداري لعضو')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد تحذيره').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب التحذير').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('مسح عدد محدد من الرسائل في الروم')
    .addIntegerOption(opt => opt.setName('العدد').setDescription('من 1 إلى 100').setRequired(true)),
  new SlashCommandBuilder().setName('lock').setDescription('قفل الروم الحالية'),
  new SlashCommandBuilder().setName('unlock').setDescription('فتح الروم الحالية'),
  new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),

  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('عرض صورة الحساب')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض صورته').setRequired(false)),

  new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('عرض تفاصيل الحساب')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض معلوماته').setRequired(false)),

  new SlashCommandBuilder().setName('server-info').setDescription('عرض معلومات السيرفر'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('يعرض لك قائمة بجميع أوامر البوت ووظائفها')
];

function hasCommandPermission(member, commandName) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const requiredRoleId = commandRoles.get(`${member.guild.id}_${commandName}`);
  if (!requiredRoleId) return true;
  return member.roles.cache.has(requiredRoleId);
}

async function sendLog(guild, logType, title, color, fields) {
  const guildLogs = logChannels.get(guild.id);
  if (!guildLogs || !guildLogs[logType]) return;
  const channel = guild.channels.cache.get(guildLogs[logType]);
  if (!channel) return;

  const logEmbed = new EmbedBuilder()
    .setTitle(title)
    .addFields(fields)
    .setColor(color)
    .setTimestamp();

  await channel.send({ embeds: [logEmbed] }).catch(() => {});
}

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, options, guild, member, channel } = interaction;

      if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('🤖 دليل وقائمة أوامر بوت Boxtar')
          .setDescription('أهلاً بك! إليك قائمة بجميع الأوامر المتاحة في البوت وشرح وظيفة كل أمر:')
          .addFields(
            { 
              name: '🛡️ الأوامر الإدارية', 
              value: '`/admin-setup` : تحديد الرتب المصرح لها باستخدام الأوامر الإدارية.\n' +
                     '`/clear` : مسح عدد محدد من الرسائل في الروم.\n' +
                     '`/kick` : طرد عضو من السيرفر.\n' +
                     '`/warn` : إرسال تحذير إداري لعضو.\n' +
                     '`/lock` / `/unlock` : قفل أو فتح الروم الحالي.\n' +
                     '`/shortcut` : إنشاء اختصار مخصص للأوامر الإدارية.', 
              inline: false 
            },
            { 
              name: '⭐ نظام اللفلات والرتب', 
              value: '`/level-setup` : إعداد وتخصيص نظام اللفلات ومعادلة الـ XP ورتب المكافآت.\n' +
                     '`/level` : عرض بطاقة اللفل المصورة وإحصائيات الـ XP (كتابة وصوت).', 
              inline: false 
            },
            { 
              name: '⚙️ أوامر النظام والأعضاء', 
              value: '`/afk` : تفعيل وضع الغياب AFK.\n' +
                     '`/avatar` : عرض صورة الحساب الشخصية.\n' +
                     '`/bad-words` : إدارة قائمة الكلمات المحظورة والعقوبات.\n' +
                     '`/logs` : إعداد وتحديد قنوات السجلات الخاصة والأحداث.\n' +
                     '`/server-info` : عرض معلومات السيرفر.\n' +
                     '`/user-info` : عرض تفاصيل الحساب.\n' +
                     '`/ping` : فحص سرعة استجابة البوت.', 
              inline: false 
            },
            { 
              name: '📝 الأوامر الخاصة', 
              value: '`/تقديم` : إدارة وتخصيص لوحات تقديم الأربعة.\n' +
                     '`/ticket-setup` : إدارة وتخصيص لوحات التذاكر.', 
              inline: false 
            }
          )
          .setFooter({ text: 'تم الطلب بواسطة ' + interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();

        return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      }

      if (commandName === 'admin-setup') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('🛡️ لوحة التحكم بصلاحيات الأوامر الإدارية')
          .setDescription('اختر الأمر الإداري الذي تريد تحديد رتبة معينة لاستخدامه:')
          .setColor(0xE74C3C);

        const menu = new StringSelectMenuBuilder()
          .setCustomId('select_admin_command')
          .setPlaceholder('اختر الأمر الإداري المراد ضبطه...')
          .addOptions(
            { label: 'حظر العضو (Ban)', value: 'ban', emoji: '🔨' },
            { label: 'طرد العضو (Kick)', value: 'kick', emoji: '👢' },
            { label: 'كتم مؤقت (Timeout)', value: 'timeout', emoji: '⏰' },
            { label: 'تحذير إداري (Warn)', value: 'warn', emoji: '⚠️' },
            { label: 'مسح الرسائل (Clear)', value: 'clear', emoji: '🧹' },
            { label: 'قفل القناة (Lock)', value: 'lock', emoji: '🔒' },
            { label: 'فتح القناة (Unlock)', value: 'unlock', emoji: '🔓' }
          );

        const row = new ActionRowBuilder().addComponents(menu);
        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'shortcut') {
        const origCmd = options.getString('الأمر_الأصلي');
        const customName = options.getString('الاسم_المختصر').toLowerCase().replace('!', '');
        customShortcuts.set(`${guild.id}_${customName}`, origCmd);

        const embed = new EmbedBuilder()
          .setTitle('⚡ تم إنشاء الاختصار بنجاح!')
          .setDescription(`أصبح يمكنك استخدام الاختصار: \`!${customName}\` لتنفيذ الأمر الإداري \`/${origCmd}\`.`)
          .setColor(0x2ECC71);

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'level-setup') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('⭐ لوحة إعدادات نظام اللفلات (Levels)')
          .setDescription('اختر الإجراء المناسب لضبط نظام التفاعل واللفلات في السيرفر:')
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_set_formula').setLabel('تحديد الـ XP الأساسي (للصعود)').setEmoji('📈').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('lvl_set_reward').setLabel('ربط لفل برتبة (Reward)').setEmoji('🎁').setStyle(ButtonStyle.Success)
        );
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_view_settings').setLabel('عرض الإعدادات الحالية').setEmoji('📋').setStyle(ButtonStyle.Secondary)
        );

        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
      }

      if (commandName === 'level') {
        await interaction.deferReply();
        const targetUser = options.getUser('العضو') || interaction.user;
        const key = `${guild.id}_${targetUser.id}`;
        const userData = userLevels.get(key) || { xp: 0, level: 0, chatXp: 0, voiceXp: 0 };
        
        const settings = levelSettings.get(guild.id) || { baseMultiplier: 200 };
        const nextLevelXp = (userData.level + 1) * settings.baseMultiplier;

        try {
          const canvas = createCanvas(800, 260);
          const ctx = canvas.getContext('2d');

          // خلفية سوداء داكنة مع إطار أحمر احترافي
          ctx.fillStyle = '#0f0f12';
          ctx.beginPath();
          ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
          ctx.fill();

          // خلفية جمالية حمراء خفيفة في الجانب
          const gradientBg = ctx.createLinearGradient(0, 0, canvas.width, 0);
          gradientBg.addColorStop(0, 'rgba(231, 76, 60, 0.2)');
          gradientBg.addColorStop(1, 'rgba(15, 15, 18, 0)');
          ctx.fillStyle = gradientBg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // شريط التقدم الخلفي (المسار)
          ctx.fillStyle = '#1e1e24';
          ctx.beginPath();
          ctx.roundRect(240, 175, 510, 28, 14);
          ctx.fill();

          // شريط التقدم الأمامي (تدرج أحمر ناري)
          const percentage = Math.min(userData.xp / nextLevelXp, 1);
          const progressWidth = Math.max(percentage * 510, 28);
          
          const redGradient = ctx.createLinearGradient(240, 0, 750, 0);
          redGradient.addColorStop(0, '#ff2a2a');
          redGradient.addColorStop(1, '#990000');
          
          ctx.fillStyle = redGradient;
          ctx.beginPath();
          ctx.roundRect(240, 175, progressWidth, 28, 14);
          ctx.fill();

          // كتابة اسم العضو
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px sans-serif';
          ctx.fillText(targetUser.username, 240, 65);

          // تفاصيل اللفل والـ XP باللون الأحمر الزاهي والأبيض
          ctx.fillStyle = '#ff4d4d';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(`LEVEL: ${userData.level}`, 240, 110);

          ctx.fillStyle = '#cccccc';
          ctx.font = '18px sans-serif';
          ctx.fillText(`XP: ${userData.xp} /${nextLevelXp}`, 400, 110);

          // إحصائيات الكتابة والصوت
          ctx.fillStyle = '#aaaaaa';
          ctx.font = '16px sans-serif';
          ctx.fillText(`Chat: ${userData.chatXp} XP   \vert{}   Voice:${userData.voiceXp} XP`, 240, 150);

          // رسم توهج أحمر خلف الصورة الشخصية (Glow)
          ctx.save();
          ctx.shadowColor = '#ff1a1a';
          ctx.shadowBlur = 25;
          ctx.beginPath();
          ctx.arc(120, 130, 75, 0, Math.PI * 2, true);
          ctx.fillStyle = '#ff1a1a';
          ctx.fill();
          ctx.restore();

          // رسم صورة البروفايل الدائرية
          ctx.save();
          ctx.beginPath();
          ctx.arc(120, 130, 72, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();

          const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
          const avatar = await loadImage(avatarURL);
          ctx.drawImage(avatar, 48, 58, 144, 144);
          ctx.restore();

          const attachment = { attachment: canvas.toBuffer('image/png'), name: 'rank-card.png' };
          return interaction.editReply({ files: [attachment] });
        } catch (err) {
          console.error(err);
          return interaction.editReply({ content: `❌ حدث خطأ أثناء إنشاء بطاقة اللفل.` });
        }
      }

      const adminCmds = ['ban', 'kick', 'timeout', 'warn', 'clear', 'lock', 'unlock'];
      if (adminCmds.includes(commandName)) {
        if (!hasCommandPermission(member, commandName)) {
          return interaction.reply({ content: '❌ **ليس لديك الرتبة المخصصة لاستخدام هذا الأمر الإداري!**', ephemeral: true });
        }
      }

      if (commandName === 'ping') return interaction.reply({ content: `🏓 السرعة: **${client.ws.ping}ms**`, ephemeral: true });

      if (commandName === 'avatar') {
        const user = options.getUser('العضو') || interaction.user;
        const embed = new EmbedBuilder().setTitle(`🖼️ صورة ${user.username}`).setImage(user.displayAvatarURL({ dynamic: true, size: 1024 })).setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'user-info') {
        const user = options.getUser('العضو') || interaction.user;
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        const embed = new EmbedBuilder()
          .setTitle(`👤 معلومات: ${user.username}`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: '🆔 الايدي:', value: user.id, inline: true },
            { name: '📅 إنشاء الحساب:', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '📥 الانضمام:', value: targetMember ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'غير معروف', inline: true }
          )
          .setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'server-info') {
        const embed = new EmbedBuilder()
          .setTitle(`🏰 سيرفر: ${guild.name}`)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: '👑 المالك:', value: `<@${guild.ownerId}>`, inline: true },
            { name: '👥 الأعضاء:', value: `${guild.memberCount}`, inline: true },
            { name: '💬 الرومات:', value: `${guild.channels.cache.size}`, inline: true }
          )
          .setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'clear') {
        const amount = options.getInteger('العدد');
        if (amount < 1 || amount > 100) return interaction.reply({ content: '❌ اختر عدداً بين 1 و 100.', ephemeral: true });
        await channel.bulkDelete(amount, true).catch(() => {});
        return interaction.reply({ content: `🧹 تم مسح **${amount}** رسالة.`, ephemeral: true });
      }

      if (commandName === 'lock') {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
        return interaction.reply({ content: '🔒 **تم قفل الروم الحالية.**' });
      }
      if (commandName === 'unlock') {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
        return interaction.reply({ content: '🔓 **تم فتح الروم الحالية.**' });
      }

      if (commandName === 'bad-words') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('🛡️ نظام تصفية الألفاظ والرقابة')
          .setDescription('إدارة وقاية الشات من الكلمات المسيئة والمحظورة تلقائياً')
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_list').setLabel('سجل الألفاظ الممنوعة').setEmoji('📜').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('bw_delete').setLabel('إزالة كلمة محددة').setEmoji('⚡').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_show_all').setLabel('استعراض كافة الكلمات المرصودة').setStyle(ButtonStyle.Primary)
        );

        const row3 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_duration').setLabel('تحديد فترة العقوبة').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('bw_disable_punish').setLabel('إيقاف العقوبة مؤقتاً').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({ embeds: [embed], components: [row1, row2, row3] });
      }

      if (commandName === 'ticket-setup') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('🎫 اعدادات التكت')
          .setDescription('اعدادات التكت من هنا')
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tk_edit_panel').setLabel('تعديل عنوان الـ panel').setEmoji('✏️').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tk_edit_btn').setLabel('تعديل الزر').setEmoji('🎨').setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tk_set_embed_color').setLabel('تغيير لون الامبد').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('tk_set_btn_color').setLabel('تغيير لون زر التكت').setEmoji('🔘').setStyle(ButtonStyle.Secondary)
        );

        const row3 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tk_set_role').setLabel('تحديد رتبة الدعم').setEmoji('🛡️').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('tk_set_category').setLabel('تحديد category وجود التكتات').setEmoji('📂').setStyle(ButtonStyle.Secondary)
        );

        const row4 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tk_general_settings').setLabel('اعدادات عامه').setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('tk_send_embed').setLabel('ارسال').setEmoji('🚀').setStyle(ButtonStyle.Success)
        );

        return interaction.editReply({ embeds: [embed], components: [row1, row2, row3, row4] });
      }

      if (commandName === 'تقديم') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder().setTitle('📂 لوحة التقديمات').setDescription('اختر التقديم لضبط إعداداته:').setColor(0xE74C3C);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('app_cfg_1').setLabel('إعداد تقديم (1)').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('app_cfg_2').setLabel('إعداد تقديم (2)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('app_cfg_3').setLabel('إعداد تقديم (3)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('app_cfg_4').setLabel('إعداد تقديم (4)').setStyle(ButtonStyle.Primary)
        );
        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'logs') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder().setTitle('📑 إعداد السجلات').setDescription('اختر نوع السجل وتحديد قناته (شامل سجل التكتات):').setColor(0xE74C3C);
        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('set_log_ban').setLabel('سجل الباند 🔨').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('set_log_kick').setLabel('سجل الطرد 👢').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('set_log_timeout').setLabel('سجل التايم ⏰').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('set_log_warn').setLabel('سجل التحذير ⚠️').setStyle(ButtonStyle.Secondary)
        );
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('set_log_ticket').setLabel('سجل التكت 🎫').setStyle(ButtonStyle.Success)
        );
        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
      }

      if (commandName === 'afk') {
        const reason = options.getString('سبب') || 'لا يوجد سبب محدد';
        afkUsers.set(interaction.user.id, { reason, timestamp: Date.now() });
        return interaction.reply({ content: `💤 تم تفعيل وضع AFK. السبب: **${reason}**` });
      }

      if (commandName === 'ban') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        await guild.members.ban(user.id, { reason });
        await sendLog(guild, 'ban', '🔨 سجل حظر جديد (Ban)', 0xE74C3C, [
          { name: '👤 العضو المحظور:', value: `${user.tag}` },
          { name: '🛡️ الإداري:', value: `${interaction.user.tag}` },
          { name: '📝 السبب الإجباري:', value: reason }
        ]);
        return interaction.reply({ content: `✅ تم حظر العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'kick') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        await targetMember.kick(reason);
        await sendLog(guild, 'kick', '👢 سجل طرد جديد (Kick)', 0xE74C3C, [
          { name: '👤 العضو المطرود:', value: `${user.tag}` },
          { name: '🛡️ الإداري:', value: `${interaction.user.tag}` },
          { name: '📝 السبب الإجباري:', value: reason }
        ]);
        return interaction.reply({ content: `✅ تم طرد العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'timeout') {
        const user = options.getUser('العضو');
        const duration = options.getInteger('المدة');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        await targetMember.timeout(duration, reason);
        await sendLog(guild, 'timeout', '⏰ سجل كتم مؤقت (Timeout)', 0xE74C3C, [
          { name: '👤 العضو المكتوم:', value: `${user.tag}` },
          { name: '🛡️ الإداري:', value: `${interaction.user.tag}` },
          { name: '⏱️ المدة:', value: `<t:${Math.floor((Date.now() + duration) / 1000)}:R>` },
          { name: '📝 السبب الإجباري:', value: reason }
        ]);
        return interaction.reply({ content: `✅ تم كتم العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'warn') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        await sendLog(guild, 'warn', '⚠️ سجل تحذير جديد (Warn)', 0xE74C3C, [
          { name: '👤 العضو:', value: `${user.tag}` },
          { name: '🛡️ الإداري:', value: `${interaction.user.tag}` },
          { name: '📝 السبب الإجباري:', value: reason }
        ]);
        return interaction.reply({ content: `✅ تم إصدار تحذير للعضو **${user.tag}**.`, ephemeral: true });
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_admin_command') {
        const selectedCmd = interaction.values[0];
        const roleMenu = new RoleSelectMenuBuilder()
          .setCustomId(`set_role_for_${selectedCmd}`)
          .setPlaceholder(`اختر الرتبة المسموح لها باستخدام أمر (${selectedCmd})...`);
        const row = new ActionRowBuilder().addComponents(roleMenu);
        return interaction.reply({ content: `📌 **حدد الرتبة التي تريد منحها صلاحية استخدام أمر \`/${selectedCmd}\`:**`, components: [row], ephemeral: true });
      }

      if (interaction.customId === 'select_embed_color') {
        const colorVal = parseInt(interaction.values[0]);
        let current = ticketData.get(interaction.guild.id) || {};
        current.embedColor = colorVal;
        ticketData.set(interaction.guild.id, current);
        return interaction.reply({ content: '🎨 **تم تغيير لون الامبد بنجاح!**', ephemeral: true });
      }

      if (interaction.customId === 'select_button_color') {
        const styleVal = parseInt(interaction.values[0]);
        let current = ticketData.get(interaction.guild.id) || {};
        current.buttonStyle = styleVal;
        ticketData.set(interaction.guild.id, current);
        return interaction.reply({ content: '🔘 **تم تغيير لون زر فتح التكت بنجاح!**', ephemeral: true });
      }

      if (interaction.customId === 'ticket_options_menu') {
        const selectedOption = interaction.values[0];
        if (selectedOption === 't_come') {
          return interaction.reply({ content: '📣 **تم إرسال نداء لصاحب التذكرة بنجاح.**', ephemeral: true });
        } else if (selectedOption === 't_add') {
          return interaction.reply({ content: '👤 **يرجى منشن العضو المراد إضافته للتذكرة.**', ephemeral: true });
        } else if (selectedOption === 't_remove') {
          return interaction.reply({ content: '👤 **يرجى منشن العضو المراد إزالته من التذكرة.**', ephemeral: true });
        } else if (selectedOption === 't_rename') {
          return interaction.reply({ content: '📝 **تم تجهيز طلب إعادة تسمية التذكرة.**', ephemeral: true });
        } else if (selectedOption === 't_rating') {
          return interaction.reply({ content: '⭐ **جاري فتح نموذج تقييم الإداري (مستلم التذكره)...**', ephemeral: true });
        } else if (selectedOption === 't_close') {
          await interaction.reply({ content: '🔒 **جاري إغلاق التذكرة وحفظ السجل...**', ephemeral: true });
          await handleTicketCloseLog(interaction.channel, interaction.guild, interaction.user);
          await interaction.channel.delete().catch(() => {});
        } else if (selectedOption === 't_unclaim') {
          const data = ticketData.get(interaction.guild.id) || {};
          if (data.supportRoleId) {
            await interaction.channel.permissionOverwrites.edit(data.supportRoleId, {
              ViewChannel: true,
              SendMessages: false,
              ReadMessageHistory: true
            }).catch(() => {});
          }
          return interaction.reply({ content: '❌ **تم إلغاء استلام التذكرة وإعادتها لقسم الدعم الفني.**', ephemeral: true });
        } else if (selectedOption === 't_restart') {
          return interaction.reply({ content: '🔄 **تم إعادة تحميل قائمة الخيارات بنجاح.**', ephemeral: true });
        }
      }
    }

    if (interaction.isRoleSelectMenu()) {
      if (interaction.customId.startsWith('set_role_for_')) {
        const selectedCmd = interaction.customId.replace('set_role_for_', '');
        const selectedRoleId = interaction.values[0];
        commandRoles.set(`${interaction.guild.id}_${selectedCmd}`, selectedRoleId);
        return interaction.reply({ content: `✅ **تم تخصيص الرتبة <@&${selectedRoleId}> لتكون الوحيدة المصرح لها لاستخدام أمر \`/${selectedCmd}\`!**`, ephemeral: true });
      }

      if (interaction.customId === 'select_ticket_support_role') {
        const roleId = interaction.values[0];
        let current = ticketData.get(interaction.guild.id) || {};
        current.supportRoleId = roleId;
        ticketData.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ **تم تحديد رتبة الدعم بنجاح: <@&${roleId}>**`, ephemeral: true });
      }
    }

    if (interaction.isChannelSelectMenu()) {
      const id = interaction.customId;
      if (id.startsWith('select_channel_')) {
        const logType = id.replace('select_channel_', '');
        const selectedChannelId = interaction.values[0];
        if (!logChannels.has(interaction.guild.id)) logChannels.set(interaction.guild.id, {});
        logChannels.get(interaction.guild.id)[logType] = selectedChannelId;
        return interaction.reply({ content: `✅ **تم تحديد القناة <#${selectedChannelId}> بنجاح لـ (${logType.toUpperCase()})!**`, ephemeral: true });
      }

      if (id === 'select_ticket_category') {
        const categoryId = interaction.values[0];
        let current = ticketData.get(interaction.guild.id) || {};
        current.categoryId = categoryId;
        ticketData.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ **تم تحديد القسم (Category) بنجاح لفتح التذاكر فيه!**`, ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === 'tk_edit_panel') {
        const modal = new ModalBuilder().setCustomId('save_ticket_panel').setTitle('تعديل عنوان ووصف الـ Panel');
        const titleInput = new TextInputBuilder().setCustomId('tk_title').setLabel('عنوان التذكرة الرئيسي').setStyle(TextInputStyle.Short).setRequired(true);
        const descInput = new TextInputBuilder().setCustomId('tk_desc').setLabel('الوصف / النص الداخلي').setStyle(TextInputStyle.Paragraph).setRequired(true);
        const imageInput = new TextInputBuilder().setCustomId('tk_img').setLabel('رابط الصورة المباشر (.png / .jpg)').setStyle(TextInputStyle.Short).setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(descInput),
          new ActionRowBuilder().addComponents(imageInput)
        );
        return await interaction.showModal(modal);
      }

      if (id === 'tk_edit_btn') {
        const modal = new ModalBuilder().setCustomId('save_ticket_button').setTitle('تعديل اسم وشكل الزر');
        const btnText = new TextInputBuilder().setCustomId('tk_btn_text').setLabel('اسم الزر').setStyle(TextInputStyle.Short).setRequired(true);
        const btnEmoji = new TextInputBuilder().setCustomId('tk_btn_emoji').setLabel('إيموجي الزر (اختياري)').setStyle(TextInputStyle.Short).setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(btnText),
          new ActionRowBuilder().addComponents(btnEmoji)
        );
        return await interaction.showModal(modal);
      }

      if (id === 'tk_set_embed_color') {
        const menu = new StringSelectMenuBuilder()
          .setCustomId('select_embed_color')
          .setPlaceholder('اختر لون الامبد...')
          .addOptions(
            { label: 'أحمر داكن', value: '15158332', emoji: '❤️' },
            { label: 'بنفسجي', value: '9807270', emoji: '💜' },
            { label: 'أزرق', value: '5793266', emoji: '💙' },
            { label: 'أخضر', value: '5763719', emoji: '💚' },
            { label: 'أصفر', value: '16776960', emoji: '💛' },
            { label: 'أسود / داكن', value: '2895667', emoji: '🖤' }
          );
        const row = new ActionRowBuilder().addComponents(menu);
        return interaction.reply({ content: '🎨 **اختر اللون المطلوب للامبد:**', components: [row], ephemeral: true });
      }

      if (id === 'tk_set_btn_color') {
        const menu = new StringSelectMenuBuilder()
          .setCustomId('select_button_color')
          .setPlaceholder('اختر لون زر التكت...')
          .addOptions(
            { label: 'أحمر (Danger)', value: `${ButtonStyle.Danger}`, emoji: '❤️' },
            { label: 'بنفسجي (Blurple)', value: `${ButtonStyle.Primary}`, emoji: '💜' },
            { label: 'أخضر (Success)', value: `${ButtonStyle.Success}`, emoji: '💚' },
            { label: 'رمادي (Secondary)', value: `${ButtonStyle.Secondary}`, emoji: '🩶' }
          );
        const row = new ActionRowBuilder().addComponents(menu);
        return interaction.reply({ content: '🔘 **اختر لون زر فتح التكت:**', components: [row], ephemeral: true });
      }

      if (id === 'tk_set_role') {
        const roleMenu = new RoleSelectMenuBuilder()
          .setCustomId('select_ticket_support_role')
          .setPlaceholder('اختر رتبة مشرفي الدعم الفني...');
        const row = new ActionRowBuilder().addComponents(roleMenu);
        return interaction.reply({ content: '🛡️ **اختر رتبة الدعم المسؤولة عن التذاكر:**', components: [row], ephemeral: true });
      }

      if (id === 'tk_set_category') {
        const channelMenu = new ChannelSelectMenuBuilder()
          .setCustomId('select_ticket_category')
          .setPlaceholder('اختر الـ Category (قسم الرومات)...')
          .addChannelTypes(ChannelType.GuildCategory);
        const row = new ActionRowBuilder().addComponents(channelMenu);
        return interaction.reply({ content: '📁 **اختر القسم (Category) الذي ستنفتح فيه التذاكر:**', components: [row], ephemeral: true });
      }

      if (id === 'tk_general_settings') {
        const modal = new ModalBuilder().setCustomId('save_ticket_general').setTitle('الإعدادات العامة للتذاكر');
        const welcomeInput = new TextInputBuilder().setCustomId('tk_welcome_msg').setLabel('رسالة الترحيب داخل التذكرة').setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(welcomeInput));
        return await interaction.showModal(modal);
      }

      if (id === 'tk_send_embed') {
        const data = ticketData.get(interaction.guild.id);
        if (!data || !data.title) {
          return interaction.reply({ content: '❌ **يرجى تعديل عنوان الـ panel وتعيين بيانات الزر أولاً!**', ephemeral: true });
        }

        const embedColor = data.embedColor ? parseInt(data.embedColor) : 0xE74C3C;
        const buttonStyle = data.buttonStyle ? parseInt(data.buttonStyle) : ButtonStyle.Danger;

        const embed = new EmbedBuilder()
          .setTitle(data.title)
          .setDescription(data.desc || 'اضغط على الزر أدناه لفتح تذكرة جديدة.')
          .setColor(embedColor);

        if (data.img && data.img.startsWith('http')) embed.setImage(data.img);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('create_ticket_btn')
            .setLabel(data.btnText || 'فتح تذكرة')
            .setEmoji(data.btnEmoji || '🎫')
            .setStyle(buttonStyle)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: '🚀 **تم نشر لوحة التذاكر بنجاح في القناة!**', ephemeral: true });
      }

      if (id === 'create_ticket_btn') {
        const modal = new ModalBuilder()
          .setCustomId('ticket_reason_modal')
          .setTitle('التذكرة');

        const reasonInput = new TextInputBuilder()
          .setCustomId('ticket_reason_input')
          .setLabel('وضح لنا طلبك أو مشكلتك باختصار:')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('اكتب تفاصيل مشكلتك، استفسارك، أو البلاغ هنا...')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        return await interaction.showModal(modal);
      }

      if (id === 'claim_ticket') {
        const data = ticketData.get(interaction.guild.id) || {};
        const supportRoleId = data.supportRoleId;

        const isSupport = supportRoleId && interaction.member.roles.cache.has(supportRoleId);
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isSupport && !isAdmin) {
          return interaction.reply({ content: '❌ **عذراً، هذه اللوحة مخصصة لطاقم الدعم الفني فقط!**', ephemeral: true });
        }

        if (supportRoleId) {
          await interaction.channel.permissionOverwrites.edit(supportRoleId, {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false
          }).catch(() => {});
        }

        await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });

        return interaction.reply({ content: `🟢 **تم استلام التذكرة بواسطة ${interaction.user}**. أصبحت التذكرة مخفية عن بقية طاقم الدعم.` });
      }

      if (id === 'close_ticket') {
        await interaction.reply({ content: '🔒 **جاري إغلاق التذكرة وحفظ السجل...**', ephemeral: true });
        await handleTicketCloseLog(interaction.channel, interaction.guild, interaction.user);
        await interaction.channel.delete().catch(() => {});
      }

      if (id === 'lvl_set_formula') {
        const modal = new ModalBuilder().setCustomId('save_lvl_formula').setTitle('تحديد الـ XP الأساسي للفل');
        const baseInput = new TextInputBuilder().setCustomId('base_xp').setLabel('الـ XP الأساسي (مثلاً 200)').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(baseInput));
        return await interaction.showModal(modal);
      }

      if (id === 'lvl_set_reward') {
        const modal = new ModalBuilder().setCustomId('save_lvl_reward').setTitle('ربط لفل برتبة تلقائية');
        const levelInput = new TextInputBuilder().setCustomId('target_level').setLabel('رقم اللفل المطلوب (مثلاً 5)').setStyle(TextInputStyle.Short).setRequired(true);
        const roleIdInput = new TextInputBuilder().setCustomId('target_role_id').setLabel('اي دي الرتبة (Role ID)').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(
          new ActionRowBuilder().addComponents(levelInput),
          new ActionRowBuilder().addComponents(roleIdInput)
        );
        return await interaction.showModal(modal);
      }

      if (id === 'lvl_view_settings') {
        const settings = levelSettings.get(interaction.guild.id) || { baseMultiplier: 200 };
        return interaction.reply({ content: `📋 **إعدادات السيرفر الحالية:**\n- مضاعف الـ XP الأساسي: **${settings.baseMultiplier} XP** لكل لفل.`, ephemeral: true });
      }

      if (id === 'ticket_support_btn') {
        const data = ticketData.get(interaction.guild.id) || {};
        const supportRoleId = data.supportRoleId;
        return interaction.reply({
          content: `📢 **تم إرسال نداء عاجل لطاقم الدعم الفني:** ${supportRoleId ? `<@&${supportRoleId}>` : 'الإداريين'}`,
          ephemeral: true
        });
      }

      if (id.startsWith('app_cfg_')) {
        const appNum = id.replace('app_cfg_', '');
        const embed = new EmbedBuilder().setTitle(`⚙️ إعدادات التقديم رقم (${appNum})`).setDescription(`اضغط على **تعديل الإعدادات والأسئلة** لتحديد الاسم والأسئلة:`).setColor(0xE74C3C);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`app_edit_full_${appNum}`).setLabel('تعديل الإعدادات والأسئلة ✏️').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`app_send_room_${appNum}`).setLabel('نشر اللوحة في القناة 📤').setStyle(ButtonStyle.Danger)
        );
        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }

      if (id.startsWith('app_edit_full_')) {
        const appNum = id.replace('app_edit_full_', '');
        const modal = new ModalBuilder().setCustomId(`save_app_modal_${appNum}`).setTitle(`تجهيز تقديم رقم (${appNum})`);
        const nameInput = new TextInputBuilder().setCustomId('app_name').setLabel('اسم/عنوان التقديم').setStyle(TextInputStyle.Short).setRequired(true);
        const q1 = new TextInputBuilder().setCustomId('q1_input').setLabel('السؤال 1').setStyle(TextInputStyle.Short).setRequired(true);
        const q2 = new TextInputBuilder().setCustomId('q2_input').setLabel('السؤال 2').setStyle(TextInputStyle.Short).setRequired(true);
        const q3 = new TextInputBuilder().setCustomId('q3_input').setLabel('السؤال 3').setStyle(TextInputStyle.Short).setRequired(true);
        const q4 = new TextInputBuilder().setCustomId('q4_input').setLabel('السؤال 4').setStyle(TextInputStyle.Short).setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(nameInput),
          new ActionRowBuilder().addComponents(q1),
          new ActionRowBuilder().addComponents(q2),
          new ActionRowBuilder().addComponents(q3),
          new ActionRowBuilder().addComponents(q4)
        );
        return await interaction.showModal(modal);
      }

      if (id.startsWith('app_send_room_')) {
        const appNum = id.replace('app_send_room_', '');
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`);
        if (!data) return interaction.reply({ content: '❌ **لم تقم بضبط إعدادات هذا التقديم بعد!**', ephemeral: true });

        const embed = new EmbedBuilder().setTitle(`📋 ${data.name}`).setDescription('اضغط على الزر أدناه لبدء تعبئة نموذج التقديم:').setColor(0xE74C3C);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`start_apply_${appNum}`).setLabel(`تقديم على ${data.name}`).setEmoji('📝').setStyle(ButtonStyle.Danger)
        );
        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: `✅ **تم نشر لوحة (${data.name}) في القناة بنجاح!**`, ephemeral: true });
      }

      if (id.startsWith('start_apply_')) {
        const appNum = id.replace('start_apply_', '');
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`);
        const modal = new ModalBuilder().setCustomId(`submit_apply_modal_${appNum}`).setTitle(data.name.substring(0, 45));
        const inputs = data.questions.map((qText, index) => {
          return new TextInputBuilder().setCustomId(`q_ans_${index + 1}`).setLabel(qText.substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true);
        });
        inputs.forEach(input => modal.addComponents(new ActionRowBuilder().addComponents(input)));
        return await interaction.showModal(modal);
      }

      if (id.startsWith('set_log_')) {
        const logType = id.replace('set_log_', '');
        const selectMenu = new ChannelSelectMenuBuilder().setCustomId(`select_channel_${logType}`).setPlaceholder('اختر الروم المخصصة للسجل...').addChannelTypes(ChannelType.GuildText);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        return interaction.reply({ content: `📌 **اختر القناة الخاصة بـ (${logType.toUpperCase()}):**`, components: [row], ephemeral: true });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'save_ticket_panel') {
        const title = interaction.fields.getTextInputValue('tk_title');
        const desc = interaction.fields.getTextInputValue('tk_desc');
        const img = interaction.fields.getTextInputValue('tk_img');

        let current = ticketData.get(interaction.guild.id) || {};
        current.title = title;
        current.desc = desc;
        current.img = img;
        ticketData.set(interaction.guild.id, current);

        return interaction.reply({ content: '✨ **تم حفظ بيانات التذكرة بنجاح!**', ephemeral: true });
      }

      if (interaction.customId === 'save_ticket_button') {
        const btnText = interaction.fields.getTextInputValue('tk_btn_text');
        const btnEmoji = interaction.fields.getTextInputValue('tk_btn_emoji');

        let current = ticketData.get(interaction.guild.id) || {};
        current.btnText = btnText;
        current.btnEmoji = btnEmoji;
        ticketData.set(interaction.guild.id, current);

        return interaction.reply({ content: '✅ **تم حفظ إعدادات الزر بنجاح!**', ephemeral: true });
      }

      if (interaction.customId === 'save_ticket_general') {
        const welcomeMsg = interaction.fields.getTextInputValue('tk_welcome_msg');
        let current = ticketSettings.get(interaction.guild.id) || {};
        current.welcomeMsg = welcomeMsg;
        ticketSettings.set(interaction.guild.id, current);

        return interaction.reply({ content: '✅ **تم حفظ رسالة الترحيب بنجاح!**', ephemeral: true });
      }

      if (interaction.customId === 'save_lvl_formula') {
        const baseXp = parseInt(interaction.fields.getTextInputValue('base_xp')) || 200;
        levelSettings.set(interaction.guild.id, { baseMultiplier: baseXp });
        return interaction.reply({ content: `✅ **تم تحديث قاعدة احتساب الـ XP بنجاح لتصبح:** \`${baseXp} XP\` كمضاعف لكل لفل.`, ephemeral: true });
      }

      if (interaction.customId === 'save_lvl_reward') {
        const targetLevel = interaction.fields.getTextInputValue('target_level');
        const roleId = interaction.fields.getTextInputValue('target_role_id');
        levelRoles.set(`${interaction.guild.id}_${targetLevel}`, roleId);
        return interaction.reply({ content: `✅ **تم ربط اللفل (${targetLevel}) بالرتبة بنجاح!**`, ephemeral: true });
      }

      if (interaction.customId === 'ticket_reason_modal') {
        const reason = interaction.fields.getTextInputValue('ticket_reason_input');
        const user = interaction.user;
        const guild = interaction.guild;
        const data = ticketData.get(guild.id) || {};
        const settings = ticketSettings.get(guild.id) || {};

        const overwrites = [
          { id: guild.id, denied: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allowed: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
        ];

        if (data.supportRoleId) {
          overwrites.push({
            id: data.supportRoleId,
            allowed: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            denied: [PermissionFlagsBits.SendMessages]
          });
        }

        const channelOptions = {
          name: `ticket-${user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: overwrites
        };

        if (data.categoryId) {
          channelOptions.parent = data.categoryId;
        }

        const ticketChannel = await guild.channels.create(channelOptions);
        const welcomeText = settings.welcomeMsg || 'يرجى انتظار مسؤولي التذكرة الرد عليك';
        
        const ticketEmbed = new EmbedBuilder()
          .setTitle('🎫  تـذكـرة جـديـدة  🎫')
          .setDescription(`### **مرحباً بك ${user} !**\n\n${welcomeText}\n\n**📝 السبب المدخل:**\n\`\`\`${reason}\`\`\``)
          .setColor(0xE74C3C)
          .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_support_btn').setLabel('طلب الدعم').setEmoji('👤').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام').setEmoji('🟢').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('close_ticket').setLabel('غلق').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
        );

        const ticketOptionsSelect = new StringSelectMenuBuilder()
          .setCustomId('ticket_options_menu')
          .setPlaceholder('📂 خيارات التكت')
          .addOptions(
            { label: 'Come', description: 'استدعاء صاحب التذكرة', value: 't_come', emoji: '📢' },
            { label: 'Add', description: 'اضافة عضو لي تذكرة', value: 't_add', emoji: '👤' },
            { label: 'Remove', description: 'إزالة عضو من التذكرة', value: 't_remove', emoji: '👤' },
            { label: 'Rename', description: 'تغيير اسم التذكرة', value: 't_rename', emoji: '📝' },
            { label: 'Rating', description: 'تقييم الإداري (مستلم التذكره)', value: 't_rating', emoji: '⭐' },
            { label: 'Close', description: 'غلق التذكرة', value: 't_close', emoji: '🔒' },
            { label: 'Unclaim', description: 'إلغاء استلاست التكت', value: 't_unclaim', emoji: '❌' },
            { label: 'Restart', description: 'إعادة تحميل القائمة', value: 't_restart', emoji: '🔄' }
          );

        const row2 = new ActionRowBuilder().addComponents(ticketOptionsSelect);

        await ticketChannel.send({
          content: `${user}${data.supportRoleId ? `<@&${data.supportRoleId}>` : ''}`, 
          embeds: [ticketEmbed],
          components: [row1, row2]
        });

        return interaction.reply({ content: `✅ **تم إنشاء تذكرتك بنجاح في القناة:** ${ticketChannel}`, ephemeral: true });
      }

      if (interaction.customId.startsWith('save_app_modal_')) {
        const appNum = interaction.customId.replace('save_app_modal_', '');
        const appName = interaction.fields.getTextInputValue('app_name');
        const q1 = interaction.fields.getTextInputValue('q1_input');
        const q2 = interaction.fields.getTextInputValue('q2_input');
        const q3 = interaction.fields.getTextInputValue('q3_input');
        const q4 = interaction.fields.getTextInputValue('q4_input');

        applicationsData.set(`${interaction.guild.id}_${appNum}`, { name: appName, questions: [q1, q2, q3, q4] });
        return interaction.reply({ content: `✅ **تم حفظ بيانات (${appName}) بنجاح!**`, ephemeral: true });
      }

      if (interaction.customId.startsWith('submit_apply_modal_')) {
        const appNum = interaction.customId.replace('submit_apply_modal_', '');
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`);
        const user = interaction.user;

        const fieldsList = data.questions.map((qText, index) => {
          const answer = interaction.fields.getTextInputValue(`q_ans_${index + 1}`);
          return { name: `🔹 ${qText}`, value: answer || 'لم يتم الإجابة' };
        });

        const resultEmbed = new EmbedBuilder()
          .setTitle(`📥 تقديم جديد لـ (${data.name})`)
          .addFields({ name: '👤 المتقدم:', value: `${user} (${user.tag})` }, ...fieldsList)
          .setColor(0xE74C3C)
          .setTimestamp();

        await interaction.channel.send({ embeds: [resultEmbed] }).catch(() => {});
        return interaction.reply({ content: '✅ **تم إرسال تقديمك بنجاح، سيتم مراجعته قريباً!**', ephemeral: true });
      }
    }
  } catch (err) {
    console.error('حدث خطأ في معالجة التفاعل:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ حدث خطأ غير متوقع أثناء معالجة طلبك.', ephemeral: true }).catch(() => {});
    } else if (interaction.deferred) {
      await interaction.editReply({ content: '❌ حدث خطأ غير متوقع أثناء معالجة طلبك.' }).catch(() => {});
    }
  }
});

async function handleTicketCloseLog(channel, guild, closedBy) {
  const guildLogs = logChannels.get(guild.id);
  if (!guildLogs || !guildLogs['ticket']) return;
  const logChannel = guild.channels.cache.get(guildLogs['ticket']);
  if (!logChannel) return;

  try {
    const fetchedMessages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = Array.from(fetchedMessages.values()).reverse();

    let transcript = sortedMessages
      .map(m => `[${new Date(m.createdTimestamp).toLocaleTimeString()}] ${m.author.tag}:${m.content || '[محتوى غير نصي/صورة]'}`)
      .join('\n');

    if (transcript.length > 3900) {
      transcript = transcript.substring(transcript.length - 3900) + '\n... (تم الاختصار لطول المحتوى)';
    }
    if (!transcript) transcript = 'لا توجد رسائل مسجلة في التذكرة.';

    const logEmbed = new EmbedBuilder()
      .setTitle('🎫 سجل إغلاق وتفاصيل محادثات التذكرة')
      .setColor(0xE74C3C)
      .addFields(
        { name: '📁 اسم التذكرة:', value: `\`${channel.name}\``, inline: true },
        { name: '🛡️ أُغلقت بواسطة:', value: `${closedBy.tag}`, inline: true },
        { name: '💬 سجل المحادثات الكامل:', value: `\`\`\`text\n${transcript}\n\`\`\`` }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });
  } catch (err) {
    console.error('خطأ أثناء حفظ سجل التذكرة:', err);
  }
}

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  if (message.content.startsWith('!')) {
    const args = message.content.slice(1).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();

    const originalCmd = customShortcuts.get(`${message.guild.id}_${cmdName}`);
    if (originalCmd) {
      if (!hasCommandPermission(message.member, originalCmd)) {
        return message.reply('❌ **ليس لديك الرتبة المخصصة لاستخدام هذا الاختصار الإداري!**');
      }

      if (originalCmd === 'clear') {
        const amount = parseInt(args[0]) || 10;
        await message.channel.bulkDelete(amount, true).catch(() => {});
        const msg = await message.channel.send(`🧹 **تم مسح ${amount} رسالة عبر الاختصار (!${cmdName})**`);
        setTimeout(() => msg.delete().catch(() => {}), 4000);
      }
      if (originalCmd === 'lock') {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.reply(`🔒 **تم قفل القناة عبر الاختصار (!${cmdName})**`);
      }
      if (originalCmd === 'unlock') {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
        return message.reply(`🔓 **تم فتح القناة عبر الاختصار (!${cmdName})**`);
      }
      if (originalCmd === 'ban') {
        const user = message.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'بدون سبب';
        if (!user) return message.reply('❌ **يرجى منشن العضو المراد حظره!**');
        await message.guild.members.ban(user.id, { reason }).catch(() => {});
        return message.reply(`✅ **تم حظر العضو ${user.tag} عبر الاختصار.**`);
      }
      if (originalCmd === 'kick') {
        const user = message.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'بدون سبب';
        if (!user) return message.reply('❌ **يرجى منشن العضو المراد طرده!**');
        const targetMember = await message.guild.members.fetch(user.id).catch(() => null);
        if (targetMember) await targetMember.kick(reason).catch(() => {});
        return message.reply(`✅ **تم طرد العضو ${user.tag} عبر الاختصار.**`);
      }
    }
  }

  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);
    const msg = await message.reply('👋 **مرحباً بعودتك! تم إيقاف وضع الـ AFK تلقائياً.**');
    setTimeout(() => msg.delete().catch(() => {}), 5000);
  }

  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach(user => {
      if (afkUsers.has(user.id)) {
        const data = afkUsers.get(user.id);
        const embed = new EmbedBuilder()
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setTitle('⚠️ هذا العضو في وضع الـ AFK حالياً')
          .addFields({ name: '📝 السبب:', value: data.reason })
          .setColor(0xE74C3C);
        message.reply({ embeds: [embed] });
      }
    });
  }

  const key = `${message.guild.id}_${message.author.id}`;
  let userData = userLevels.get(key) || { xp: 0, level: 0, chatXp: 0, voiceXp: 0 };

  const earnedXp = Math.floor(Math.random() * 11) + 15;
  userData.xp += earnedXp;
  userData.chatXp += earnedXp;

  const settings = levelSettings.get(message.guild.id) || { baseMultiplier: 200 };
  const requiredXp = (userData.level + 1) * settings.baseMultiplier;

  if (userData.xp >= requiredXp) {
    userData.level += 1;
    userData.xp -= requiredXp;

    const levelUpEmbed = new EmbedBuilder()
      .setTitle('🎉 مبروك الترقي!')
      .setDescription(`تهانينا ${message.author}! لقد صعدت إلى **اللفل ${userData.level}** 🚀`)
      .setColor(0xE74C3C);
    
    message.channel.send({ embeds: [levelUpEmbed] }).catch(() => {});

    const rewardRoleId = levelRoles.get(`${message.guild.id}_${userData.level}`);
    if (rewardRoleId) {
      const member = message.guild.members.cache.get(message.author.id);
      if (member) {
        member.roles.add(rewardRoleId).catch(() => {});
      }
    }
  }

  userLevels.set(key, userData);
});

setInterval(() => {
  client.guilds.cache.forEach(guild => {
    guild.channels.cache.forEach(channel => {
      if (channel.type === ChannelType.GuildVoice) {
        channel.members.forEach(member => {
          if (member.user.bot) return;

          const key = `${guild.id}_${member.id}`;
          let userData = userLevels.get(key) || { xp: 0, level: 0, chatXp: 0, voiceXp: 0 };

          const voiceXpGain = 10;
          userData.xp += voiceXpGain;
          userData.voiceXp += voiceXpGain;

          const settings = levelSettings.get(guild.id) || { baseMultiplier: 200 };
          const requiredXp = (userData.level + 1) * settings.baseMultiplier;

          if (userData.xp >= requiredXp) {
            userData.level += 1;
            userData.xp -= requiredXp;
            
            const rewardRoleId = levelRoles.get(`${guild.id}_${userData.level}`);
            if (rewardRoleId) {
              member.roles.add(rewardRoleId).catch(() => {});
            }
          }

          userLevels.set(key, userData);
        });
      }
    });
  });
}, 60000);

const TOKEN = process.env.TOKEN;
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
  console.log(`✅ تم تنشيط البوت بنجاح باسم: ${client.user.tag}`);
  try {
    console.log('🔄 جاري تسجيل وتثبيت كافة الأوامر والميزات...');
    await rest.put(
      Routes.applicationCommands(client.user.id), 
      { body: commands }
    );
    console.log('✅ تم تسجيل النظام بنجاح!');
  } catch (err) {
    console.error('❌ خطأ أثناء تسجيل الأوامر:', err);
  }
});

client.login(TOKEN);
